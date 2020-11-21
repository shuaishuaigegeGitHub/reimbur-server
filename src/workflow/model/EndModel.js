import BaseModel from "./BaseModel";

/**
 * 结束节点类型
 */
export default class EndModel extends BaseModel {
    constructor(id, name, nodeType, nextNodeId, ext) {
        super(id, name, nodeType, nextNodeId, ext);
    }
}
