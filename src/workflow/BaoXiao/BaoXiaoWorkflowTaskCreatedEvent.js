import WorkflowTaskCreatedEvent from "../event/WorkflowTaskCreatedEvent";

/**
 * 报销流程任务事件
 */
export default class BaoXiaoWorkflowTaskCreatedEvent extends WorkflowTaskCreatedEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    async onEvent(workflowInstance, nodeModel, param) {
        global.logger.info("报销流程任务创建[%s]", nodeModel.name);
        // TODO: 报销任务逻辑开始
    }
}
