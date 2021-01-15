import WorkflowStartNodeEvent from "../event/WorkflowStartNodeEvent";

/**
 * 报销流程开始事件
 */
export default class BaoXiaoWorkflowStartNodeEvent extends WorkflowStartNodeEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    async onEvent(workflowInstance, nodeModel, param) {
        global.logger.info("报销流程开始事件");
        // TODO: 报销开始逻辑
    }
}
