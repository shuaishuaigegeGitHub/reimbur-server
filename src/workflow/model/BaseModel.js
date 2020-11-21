/**
 * 流程节点基础类型
 */
export default class BaseModel {
    constructor(id, name, nodeType, nextNodeId, ext) {
        this.id = id;
        this.name = name;
        this.nodeType = nodeType;
        this.nextNodeId = nextNodeId;
        this.ext = ext || {};
    }
}
