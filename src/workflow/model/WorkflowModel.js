import StartModel from "./StartModel";
import EndModel from "./EndModel";

/**
 * 流程模型，记录了该流程的所有节点信息。
 */
export default class WorkflowModel {
    constructor(id, flowName) {
        this.id = id;
        this.flowName = flowName;
        this.nodeList = [];
    }

    /**
     * 根据节点ID查找对应的节点
     * @param {string} nodeId 节点ID
     */
    getNodeModel(nodeId) {
        if (!this.nodeList.length) {
            return null;
        }
        return this.nodeList.find((node) => {
            return node.id === nodeId;
        });
    }

    /**
     * 查找开始节点
     */
    getStartModel() {
        if (!this.nodeList.length) {
            return null;
        }
        return this.nodeList.find((node) => {
            return node instanceof StartModel;
        });
    }

    /**
     * 查找结束节点
     */
    getEndModel() {
        if (!this.nodeList.length) {
            return null;
        }
        return this.nodeList.find((node) => {
            return node instanceof EndModel;
        });
    }

    /**
     * 根据节点ID查找对应的上一层节点
     * @param {string} nodeId 节点ID
     */
    getPreNodeModel(nodeId) {
        if (!this.nodeList.length) {
            return null;
        }
        return this.nodeList.find((node) => {
            return node.nextNodeId === nodeId;
        });
    }
}
