import WorkflowTaskNodeEvent from "../event/WorkflowTaskNodeEvent";

/**
 * 报销流程任务事件
 */
export default class BaoXiaoWorkflowTaskNodeEvent extends WorkflowTaskNodeEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async onEvent(workflowInstance, nodeModel, workflowParam) {
        global.logger.info("报销流程任务[%s]", nodeModel.name);
        // TODO: 报销任务逻辑开始
        // 1.如果报销人，与当前节点审批人是同一个，那么是否直接跳过当前节点（直接同意），进行下一节点？
        // 2.如果报销人，不必经过当前审批人，那如何直接跳过当前节点（直接同意）进行下一节点
    }
}
