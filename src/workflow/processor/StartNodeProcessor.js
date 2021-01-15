import WorkflowNodeProcessor from "./WorkflowNodeProcessor";
import { START_NODE_TYPE } from "../WorkflowConstant";
import WorkflowStartNodeEvent from "../event/WorkflowStartNodeEvent";
import GlobalError from "@/common/GlobalError";

/**
 * 开始节点处理器
 */
export default class StartNodeProcessor extends WorkflowNodeProcessor {
    constructor(startNodeEvent) {
        super();
        if (!(startNodeEvent instanceof WorkflowStartNodeEvent)) {
            throw new GlobalError(
                600,
                `${StartNodeProcessor.name} 需要事件 ${WorkflowStartNodeEvent.name}`
            );
        }
        this.nodeType = START_NODE_TYPE;
        this.startNodeEvent = startNodeEvent;
    }

    /**
     * 流程开始节点处理方法
     * @param {object} workflowInstance 流程实例
     * @param {object} workflowModel 流程模型
     * @param {object} nodeModel 节点模型
     * @param {object} param 流程参数
     */
    async process(workflowInstance, workflowModel, nodeModel, param) {
        const startModel = workflowModel.getStartModel();
        await this.startNodeEvent.onEvent(workflowInstance, startModel, param);
    }
}
