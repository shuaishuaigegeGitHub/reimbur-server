import WorkflowNodeProcessor from "./WorkflowNodeProcessor";
import { END_NODE_TYPE } from "../WorkflowConstant";
import WorkflowEndNodeEvent from "../event/WorkflowEndNodeEvent";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import sequelize from "@/model/index";
import { WORKFLOW_INSTANCE_STATUS_END } from "../WorkflowConstant";

const { models } = sequelize;

/**
 * 结束节点处理器
 */
export default class EndNodeProcessor extends WorkflowNodeProcessor {
    constructor(endNodeEvent) {
        super();
        if (!(endNodeEvent instanceof WorkflowEndNodeEvent)) {
            throw new GlobalError(
                600,
                `${EndNodeProcessor.name} 需要事件 ${WorkflowEndNodeEvent.name}`
            );
        }
        this.nodeType = END_NODE_TYPE;
        this.endNodeEvent = endNodeEvent;
    }

    /**
     * 流程结束节点处理方法
     * @param {object} workflowInstance 流程实例
     * @param {object} workflowModel 流程模型
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    async process(workflowInstance, workflowModel, nodeModel, param) {
        await models.workflow_instance.update(
            {
                cur_node_id: nodeModel.id,
                next_node_id: "",
                status: WORKFLOW_INSTANCE_STATUS_END,
                updatetime: dayjs().unix(),
                update_by: param.operator,
            },
            {
                where: {
                    id: workflowInstance.id,
                },
            }
        );
        await this.endNodeEvent.onEvent(workflowInstance, nodeModel, param);
    }
}
