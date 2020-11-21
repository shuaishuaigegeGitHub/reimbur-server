import WorkflowCtl from "./WorkflowCtl";
import WorkflowNodeProcessorCtl from "./processor/WorkflowNodeProcessorCtl";
import StartNodeProcessor from "./processor/StartNodeProcessor";
import BaoXiaoWorkflowStartNodeEvent from "./BaoXiao/BaoXiaoWorkflowStartNodeEvent";
import EndNodeProcessor from "./processor/EndNodeProcessor";
import BaoXiaoWorkflowEndNodeEvent from "./BaoXiao/BaoXiaoWorkflowEndNodeEvent";
import TaskNodeProcessor from "./processor/TaskNodeProcessor";
import BaoXiaoWorkflowTaskNodeEvent from "./BaoXiao/BaoXiaoWorkflowTaskNodeEvent";
import BaoXiaoWorkflowTaskCreatedEvent from "./BaoXiao/BaoXiaoWorkflowTaskCreatedEvent";
import BaoXiaoUserService from "./BaoXiao/BaoXiaoUserService";

/**
 * 流程处理工厂
 */
export default class WorkflowCtlFactory {
    /**
     * @returns {WorkflowCtl} 报销流程处理引擎
     */
    static baoXiaoWorkflowCtl() {
        if (!WorkflowCtlFactory.baoXiaoWorkflowCtlInstance) {
            const workflowNodeProcessorList = [
                new StartNodeProcessor(new BaoXiaoWorkflowStartNodeEvent()),
                new EndNodeProcessor(new BaoXiaoWorkflowEndNodeEvent()),
                new TaskNodeProcessor(
                    new BaoXiaoWorkflowTaskNodeEvent(),
                    new BaoXiaoWorkflowTaskCreatedEvent(),
                    new BaoXiaoUserService()
                ),
            ];
            const workflowNodeProcessorCtl = new WorkflowNodeProcessorCtl(
                workflowNodeProcessorList
            );
            WorkflowCtlFactory.baoXiaoWorkflowCtlInstance = new WorkflowCtl(
                workflowNodeProcessorCtl
            );
        }
        return WorkflowCtlFactory.baoXiaoWorkflowCtlInstance;
    }
}
