import BaseModel from "./BaseModel";

/**
 * 任务节点类型
 */
export default class TaskModel extends BaseModel {
    constructor(
        id,
        name,
        nodeType,
        nextNodeId,
        ext,
        approveUser,
        approveUserName
    ) {
        super(id, name, nodeType, nextNodeId, ext);
        this.approveUser = approveUser;
        this.approveUserName = approveUserName;
    }
}
