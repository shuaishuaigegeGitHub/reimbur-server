/**
 * 节点处理器
 */
export default class WorkflowNodeProcessor {
    /**
     * 要处理的节点类型
     */
    getNodeType() {
        return this.nodeType;
    }

    /**
     * 流程节点处理方法
     * @param {object} workflow 流程
     * @param {object} workflowModel 流程模型
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    process(workflow, workflowModel, nodeModel, param) {}
}
