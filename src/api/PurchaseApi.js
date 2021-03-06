import Router from "koa-router";
import * as PurchaseService from "@/service/PurchaseService";

const router = new Router({
    prefix: "/purchase",
});

/**
 * 查询我的采购
 */
router.post("/query-my-purchase", async (ctx) => {
    const params = ctx.request.body || {};
    params.applicant = ctx.state.uid;
    const data = await PurchaseService.queryMyPurchase(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的审批
 */
router.post("/query-my-shenpi", async (ctx) => {
    const params = ctx.request.body || {};
    params.actor_user_id = ctx.state.uid;
    const data = await PurchaseService.queryMyShenPi(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的待审批个数
 */
router.get("/query-my-shenpi-count", async (ctx) => {
    const params = {
        id: ctx.state.uid,
    };
    const data = await PurchaseService.queryMyShenpiCount(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的抄送
 */
router.post("/query-my-copy", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    const data = await PurchaseService.queryMyCopy(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 提交采购申请
 */
router.post("/submit", async (ctx) => {
    const params = ctx.request.body || {};
    params.applicant = ctx.state.uid;
    params.applicant_name = ctx.state.userName;
    params.update_by = ctx.state.userName;
    await PurchaseService.submit(params);
    ctx.renderJson({ msg: "提交成功" });
});

/**
 * 编辑采购申请
 */
router.post("/edit", async (ctx) => {
    const params = ctx.request.body || {};
    params.applicant = ctx.state.uid;
    params.applicant_name = ctx.state.userName;
    params.update_by = ctx.state.userName;
    await PurchaseService.edit(params);
    ctx.renderJson({ msg: "提交成功" });
});

/**
 * 取消报销申请
 */
router.post("/cancel", async (ctx) => {
    const params = ctx.request.body || {};
    params.applicant = ctx.state.uid;
    params.update_by = ctx.state.userName;
    const data = await PurchaseService.cancelPurchase(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询采购流程数据和明细数据
 */
router.get("/query-process-detail", async (ctx) => {
    const params = ctx.request.query || {};
    const data = await PurchaseService.queryProcessDetail(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询采购实例
 */
router.get("/instance/:id", async (ctx) => {
    const data = await PurchaseService.queryInstance(ctx.params.id);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 同意采购
 */
router.post("/complete", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await PurchaseService.completePurchaseTask(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 驳回采购
 */
router.post("/reject", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await PurchaseService.rejectPurchaseTask(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 查询采购实例（用于报销）
 */
router.get("/reimbur/:id", async (ctx) => {
    const data = await PurchaseService.queryInstanceToReimbur(
        ctx.params.id,
        ctx.state.uid
    );
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询最近一次的抄送人列表
 */
router.get("/last-copy", async (ctx) => {
    const data = await PurchaseService.queryLastCopyList(ctx.state.uid);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 添加评论
 */
router.post("/comment", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await PurchaseService.addComment(params);
    ctx.renderJson({ msg: "查询成功" });
});

/**
 * 强制驳回采购（在采购通过后使用，改变状态为驳回）
 */
router.post("/force-reject", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await PurchaseService.forceRejectPurchase(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 查询最近一次的抄送人列表
 */
router.post("/detail-list", async (ctx) => {
    const data = await PurchaseService.queryDetailList(ctx.request.body);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 删除采购申请
 */
router.post("/delete", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    await PurchaseService.deletePurchase(params);
    ctx.renderJson({ msg: "操作成功" });
});

export default router;
