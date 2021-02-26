import Router from "koa-router";
import * as ExternalSerevice from "@/service/ExternalSerevice";

const router = new Router({
    prefix: "/external",
});

/**
 * 买量报销单生成（未完成先关闭）
 */
router.post("/payment-baoxiao-generate", async (ctx) => {
    await ExternalSerevice.paymentBaoXiaoGenerate(ctx.request.body.sign);
    ctx.renderJson({ msg: "报销单生成成功" });
});

/**
 * 完成某个task
 */
router.post("/finish-task", async (ctx) => {
    await ExternalSerevice.finishWorkflowTask(ctx.request.body.sign);
    ctx.renderJson({ msg: "报销单生成成功" });
});

export default router;
