import BaseModel from "./BaseModel";

/**
 * 开始节点类型
 */
export default class StartModel extends BaseModel {
    constructor(id, name, nodeType, nextNodeId, ext) {
        super(id, name, nodeType, nextNodeId, ext);
    }
}
