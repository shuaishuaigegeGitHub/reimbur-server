import StartModel from "../model/StartModel";
import EndModel from "../model/EndModel";
import TaskModel from "../model/TaskModel";
import WorkflowModel from "../model/WorkflowModel";
import {
    START_NODE_TYPE,
    END_NODE_TYPE,
    TASK_NODE_TYPE,
} from "../WorkflowConstant";

/**
 * 解析流程定义，获取节点信息
 * @param {object} workflow 流程定义
 * @returns {WorkflowModel} 返回流程模型
 */
export default (workflow) => {
    if (!workflow) {
        return null;
    }
    const workflowModel = new WorkflowModel(workflow.id, workflow.flow_name);
    // 流程定义节点信息
    const root = JSON.parse(workflow.flow_define);
    const nodeList = root.nodes;
    if (!(nodeList instanceof Array)) {
        return null;
    }
    for (let i = 0; i < nodeList.length; i++) {
        let node = nodeList[i];
        if (node.nodeType === START_NODE_TYPE) {
            // 开始节点
            workflowModel.nodeList.push(
                new StartModel(
                    node.id,
                    node.name,
                    node.nodeType,
                    nodeList[i + 1].id,
                    node.ext
                )
            );
        } else if (node.nodeType === END_NODE_TYPE) {
            // 结束节点
            workflowModel.nodeList.push(
                new EndModel(node.id, node.name, node.nodeType, null, node.ext)
            );
        } else if (node.nodeType === TASK_NODE_TYPE) {
            // 任务节点
            workflowModel.nodeList.push(
                new TaskModel(
                    node.id,
                    node.name,
                    node.nodeType,
                    nodeList[i + 1].id,
                    node.ext,
                    node.approveUser,
                    node.approveUserName
                )
            );
        }
    }
    return workflowModel;
};
