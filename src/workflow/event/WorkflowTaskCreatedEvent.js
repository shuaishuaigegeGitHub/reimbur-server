/**
 * 流程任务创建事件
 */
export default class WorkflowTaskCreatedEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async onEvent(workflowInstance, nodeModel, workflowParam) {}
}
