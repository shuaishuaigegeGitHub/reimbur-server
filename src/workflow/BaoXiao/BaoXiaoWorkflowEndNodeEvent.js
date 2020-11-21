import WorkflowEndNodeEvent from "../event/WorkflowEndNodeEvent";

/**
 * 报销流程结束事件
 */
export default class BaoXiaoWorkflowEndNodeEvent extends WorkflowEndNodeEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async onEvent(workflowInstance, nodeModel, workflowParam) {
        global.logger.info("报销流程结束事件");
        // TODO: 报销结束逻辑
    }
}
