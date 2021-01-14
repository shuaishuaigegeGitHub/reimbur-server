import StartModel from "../model/StartModel";
import EndModel from "../model/EndModel";

/**
 * 节点处理器控制器
 */
export default class WorkflowNodeProcessorCtl {
    constructor(workflowNodeProcessorList) {
        this.workflowNodeProcessorList = workflowNodeProcessorList || [];
    }

    /**
     * 流程节点处理器控制
     * @param {object} workflowInstance 流程实例
     * @param {object} workflowModel 流程模型
     * @param {object} nodeModel 节点模型
     * @param {object} param 参数
     */
    async process(workflowInstance, workflowModel, nodeModel, param) {
        if (!nodeModel) {
            return;
        }
        for (let processor of this.workflowNodeProcessorList) {
            if (processor.getNodeType() === nodeModel.nodeType) {
                if (nodeModel instanceof StartModel) {
                    // 如果当前节点是开始节点
                    await processor.process(
                        workflowInstance,
                        workflowModel,
                        nodeModel,
                        param
                    );

                    // 获取下一节点
                    const nextModel = workflowModel.getNodeModel(
                        nodeModel.nextNodeId
                    );
                    // 执行下一模型
                    await this.process(
                        workflowInstance,
                        workflowModel,
                        nextModel,
                        param
                    );
                } else if (nodeModel instanceof EndModel) {
                    // 如果当前节点是结束节点
                    await processor.process(
                        workflowInstance,
                        workflowModel,
                        nodeModel,
                        param
                    );
                } else {
                    // 如果是任务节点
                    await processor.process(
                        workflowInstance,
                        workflowModel,
                        nodeModel,
                        param
                    );
                }
                break;
            }
        }
    }
}
