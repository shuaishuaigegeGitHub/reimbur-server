/**
 * 流程开始事件
 */
export default class WorkflowStartNodeEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    async onEvent(workflowInstance, nodeModel, param) {}
}
