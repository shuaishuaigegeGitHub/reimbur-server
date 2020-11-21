import StartModel from "../model/StartModel";
import EndModel from "../model/EndModel";
import dayjs from "dayjs";
import sequelize from "@/model/index";
import { WORKFLOW_INSTANCE_STATUS_END } from "../WorkflowConstant";

const { models } = sequelize;

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
     * @param {object} workflowParam 流程参数
     */
    async process(workflowInstance, workflowModel, nodeModel, workflowParam) {
        if (!nodeModel) {
            return;
        }
        for (let processor of this.workflowNodeProcessorList) {
            if (processor.getNodeType() === nodeModel.nodeType) {
                if (nodeModel instanceof StartModel) {
                    // 如果当前节点是开始节点
                    await processor.process(workflowInstance, workflowModel, nodeModel, workflowParam);

                    // 获取下一节点
                    const nextModel = workflowModel.getNodeModel(nodeModel.nextNodeId);
                    // 执行下一模型
                    await this.process(workflowInstance, workflowModel, nextModel, workflowParam);
                } else if (nodeModel instanceof EndModel) {
                    // 如果当前节点是结束节点
                    await models.workflow_instance.update(
                        {
                            cur_node_id: nodeModel.id,
                            next_node_id: "",
                            status: WORKFLOW_INSTANCE_STATUS_END,
                            updatetime: dayjs().unix(),
                            update_by: workflowParam.operator,
                        },
                        {
                            where: {
                                id: workflowInstance.id,
                            },
                        }
                    );
                } else {
                    // 如果是任务节点
                    await processor.process(workflowInstance, workflowModel, nodeModel, workflowParam);
                    await models.workflow_instance.update(
                        {
                            cur_node_id: nodeModel.id,
                            next_node_id: nodeModel.nextNodeId,
                            updatetime: dayjs().unix(),
                            update_by: workflowParam.operator,
                        },
                        {
                            where: {
                                id: workflowInstance.id,
                            },
                        }
                    );
                }
                break;
            }
        }
    }
}
