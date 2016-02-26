package jenkins.install;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Logger;

import org.jvnet.hudson.reactor.Reactor;
import org.jvnet.hudson.reactor.Task;
import org.jvnet.hudson.reactor.TaskBuilder;

import hudson.PluginManager;
import hudson.init.InitMilestone;
import hudson.init.InitStrategy;
import jenkins.model.Jenkins;

/**
 * This class is responsible for skipping any init tasks that result in
 * open ports
 */
public class SplitInitStrategy extends InitStrategy {
    private static final Logger LOGGER = Logger.getLogger(SplitInitStrategy.class.getName());

    protected InitStrategy delegate;
    protected InitMilestone milestone;
    protected Set<Task> executed = new HashSet<Task>();
    protected Set<Task> skipped = new HashSet<Task>();
    protected TaskBuilder[] taskBuilders;

    public SplitInitStrategy(InitStrategy delegate, InitMilestone milestone, TaskBuilder ... taskBuilders) {
        this.delegate = delegate;
        this.milestone = milestone;
        this.taskBuilders = taskBuilders;
    }

    /**
     * Continues initialization, re-running any skipped tasks
     */
    public TaskBuilder[] continueInitialization() throws IOException {
        return continueInitialization(null);
    }

    /**
     * Continues initialization, re-running any skipped tasks through
     * the provided milestone
     * @param milestone the milestone to execute through
     * @return a new set of TaskBuilders to pass to {@link Jenkins#executeReactor}
     */
    public TaskBuilder[] continueInitialization(InitMilestone milestone) {
        this.milestone = milestone;
        return new TaskBuilder[] {
            new TaskBuilder() {
                @Override
                public Iterable<? extends Task> discoverTasks(Reactor reactor) throws IOException {
                    return skipped;
                }
            },
            InitMilestone.ordering() // re-run ordering
        };
    }

    @Override
    public List<File> listPluginArchives(PluginManager pm) throws IOException {
        return delegate.listPluginArchives(pm);
    }

    /**
     * Underlying InitStrategy
     */
    public InitStrategy getDelegate() {
        return delegate;
    }

    public TaskBuilder[] getTaskBuilders() {
        return taskBuilders;
    }

    public SplitInitStrategy withTaskBuilders(TaskBuilder ... taskBuilders) {
        this.taskBuilders = taskBuilders;
        return this;
    }

    /**
     * Skips tasks after the defined milestone and previously executed tasks
     */
    @Override
    public boolean skipInitTask(Task task) {
        if(executed.contains(task)) {
            LOGGER.fine("SplitInitStrategy: Skipping previously executed task: " + task.getDisplayName());
            return true; // don't re-execute tasks
        }
        else if(delegate.skipInitTask(task)) {
            LOGGER.fine("SplitInitStrategy: Skipping task due to delegate: " + task.getDisplayName());
            return true; // don't execute tasks the delegate indicates we should skip
        }
        else if(milestone == null || Jenkins.getInstance().getInitLevel().ordinal() <= milestone.ordinal()) {
            LOGGER.fine("InitStrategy: Executing task: " + task.getDisplayName());
            executed.add(task);
            return false;
        }
        else {
            LOGGER.fine("InitStrategy: Skipping task after milestone " + task.getDisplayName());
            skipped.add(task);
            return true;
        }
    }
}
