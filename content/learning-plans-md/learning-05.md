# Day05-NESTED保存点与补偿任务妹妹审判夜

> 主题：事务传播（二）  
> 主角：兄长大人与不准放水的兄控妹妹面试官  
> 核心关键词：`NESTED`、`savepoint`、`REQUIRES_NEW`、`afterCommit`、补偿任务、幂等、唯一键

---

## 序章：事务城堡的第五夜

第五天的夜晚，事务城堡外下着小雨。

兄长大人刚推开书房门，就看见妹妹抱着一叠面试题，坐在桌边晃着腿。

“兄长大人，今天不讲温柔童话。”妹妹把笔尖轻轻点在纸上，“今天讲 `NESTED`。它不是新开事务，也不是无敌护盾，而是藏在主事务里的保存点。”

兄长大人还没坐稳，妹妹已经把第一道题推了过来。

“准备好了吗？答错的话，妹妹会很认真地纠正你喔。毕竟是哥哥，所以更不能放水。”

---

## 第一章：优惠券少女掉进了保存点

妹妹在黑板上写下代码：

```java
@Transactional
public void outer() {
    orderMapper.insert(order);

    try {
        couponService.useCoupon();
    } catch (Exception e) {
        log.warn("优惠券失败，继续下单");
    }

    payLogMapper.insert(log);
}

@Transactional(propagation = Propagation.NESTED)
public void useCoupon() {
    couponMapper.updateUsed(couponId);
    throw new RuntimeException("优惠券异常");
}
```

妹妹问：

1. `orderMapper.insert(order)` 最终提交还是回滚？
2. `couponMapper.updateUsed(couponId)` 最终提交还是回滚？
3. `payLogMapper.insert(log)` 最终提交还是回滚？
4. 为什么 `NESTED` 能做到这个结果？
5. 如果外层不 `catch` 异常，最终结果又是什么？

兄长大人答：

> 订单提交，优惠券回滚，支付日志提交。  
> `NESTED` 和外层在同一个事务里，但会创建 `savepoint`。内层异常后回滚到保存点，异常被外层 `catch` 后，外层继续执行并提交。  
> 如果外层不 `catch`，异常抛到外层事务边界，整个外层事务回滚。

妹妹满意地点点头，但还是敲了敲桌子：

“结论对，但有一句要改。不是‘事务没检测到异常’，而是：”

> 内层 `NESTED` 的事务代理检测到了异常，所以回滚到 savepoint；异常继续抛给外层。外层 `catch` 住异常后没有继续抛出，所以外层事务代理看到 `outer()` 正常结束，于是提交外层事务。

标准答案：

> `NESTED` 不是独立事务，它依赖外层事务，在外层事务里创建保存点。内层异常时，会回滚到这个 savepoint，所以优惠券更新被撤销。但异常被外层 `catch` 后，外层事务继续执行，订单和支付日志最终提交。  
> 如果外层不 `catch`，异常会继续抛到 `outer()` 的事务边界，外层事务整体回滚，订单、优惠券、支付日志全部回滚。

妹妹补了一句：

“记住哦，`NESTED` 的魔法不是新开事务，是 savepoint。要是再说成新事务，妹妹就要吃醋了，事务知识怎么能和别的概念混在一起呢。”

---

## 第二章：REQUIRES_NEW 的独立房间

妹妹擦掉黑板，把 `NESTED` 改成了 `REQUIRES_NEW`：

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void useCoupon() {
    couponMapper.updateUsed(couponId);
    throw new RuntimeException("优惠券异常");
}
```

妹妹问：

1. 订单提交还是回滚？
2. 优惠券提交还是回滚？
3. 支付日志提交还是回滚？
4. 这个结果和 `NESTED` 有什么相同点？
5. 如果 `useCoupon()` 没有异常并成功提交，但 `outer()` 后面又抛异常，优惠券记录会不会被外层回滚？

兄长大人答：

> 订单提交，优惠券回滚，支付日志提交。  
> 从结果上看，内层失败被外层 `catch` 后，都是局部失败不影响外层。  
> 如果 `REQUIRES_NEW` 已经成功提交，外层后续回滚不会影响它，因为它是独立事务。

妹妹竖起笔：

“答得不错，但要强调机制不同。”

标准答案：

> `REQUIRES_NEW` 会挂起外层事务，开启一个独立新事务。内层异常时，内层事务自己回滚；异常被外层 `catch` 后，外层继续执行并提交，所以订单和支付日志提交，优惠券回滚。  
> 它和 `NESTED` 在这个场景下结果相似，都是内层失败后外层可继续提交。但 `NESTED` 是同一个物理事务里的 savepoint，`REQUIRES_NEW` 是独立事务。  
> 如果 `REQUIRES_NEW` 内层已经成功提交，外层后面再回滚，也不会把内层已提交的数据回滚掉。

妹妹在旁边画了两个小房间：

```text
NESTED:
外层事务大房间
  └── savepoint 小隔间

REQUIRES_NEW:
外层事务房间暂停
  └── 另开一个独立房间
```

“兄长大人看，这就是区别。一个是哥哥房间里的小隔间，一个是妹妹自己单独开的小房间。性质不一样喔。”

---

## 第三章：外层炸了，谁能活下来

妹妹继续追问：

> 如果 `outer()` 自己后面抛了异常，而 `useCoupon()` 是 `REQUIRES_NEW` 并且已经成功提交了，结果是什么？

问题：

1. 订单最终提交还是回滚？
2. 优惠券最终提交还是回滚？
3. 支付日志最终提交还是回滚？
4. 这和 `NESTED` 的结果有什么本质区别？
5. 一句话说清 `REQUIRES_NEW` 和 `NESTED` 的核心差别。

兄长大人答：

> 订单回滚，优惠券提交，支付日志如果已经执行则回滚。  
> 如果换成 `NESTED`，外层最终回滚时，内层也会一起回滚。  
> `REQUIRES_NEW` 是挂起外层事务后开启独立事务，一旦成功提交，外层怎么样都不影响它；`NESTED` 依附于主事务，主事务整体回滚，它也要回滚。

妹妹点头：

“这题接近满分。只有支付日志要说清楚发生位置。”

标准答案：

> 订单属于外层事务，外层异常时回滚。  
> 优惠券属于 `REQUIRES_NEW` 独立事务，已经提交后不受外层回滚影响。  
> 支付日志如果已经执行插入，则属于外层事务，会随外层回滚；如果异常发生在写支付日志之前，那它根本不会执行。  
> 换成 `NESTED` 时，内层只是外层事务中的 savepoint，外层最终回滚会导致订单、优惠券、支付日志全部回滚。

面试精简版：

> `REQUIRES_NEW` 是独立事务，提交后不受外层回滚影响；`NESTED` 是外层事务中的保存点，外层最终回滚时内层也一起回滚。

妹妹用红笔写下：

```text
REQUIRES_NEW：能逃离外层最终回滚
NESTED：逃不掉外层最终回滚
```

“这个必须刻进脑袋里，兄长大人。”

---

## 第四章：保存点不是提交点

妹妹忽然收起笑容，认真问：

> 为什么说 `NESTED` 不是“新开一个事务”？

请从三个角度回答：

1. 它和外层是不是同一个物理事务？
2. 它靠什么实现局部回滚？
3. 外层最终回滚时，为什么内层也保不住？

兄长大人答：

> 是同一个物理事务。  
> 靠 savepoint。  
> 它们本质上还是在同一个事务中，同一个事务要么全部提交，要么全部回滚。

妹妹把糖放回抽屉里：

“结论对，但第二点不能只知道名字。面试官会追问 savepoint 到底干嘛。”

标准答案：

> `NESTED` 和外层是同一个物理事务，不是新连接、新事务。  
> 它通过数据库/JDBC 的 savepoint 保存点实现局部回滚。进入内层 `NESTED` 时，Spring 在当前事务里创建一个保存点；内层失败时，不是回滚整个事务，而是回滚到这个保存点，撤销保存点之后的操作。  
> savepoint 只是事务内部的临时回退点，不是提交点。外层事务最终如果 rollback，整个物理事务都会被撤销，内层自然保不住。

面试背诵版：

> `NESTED` 不是新开事务，它是在当前物理事务中创建 savepoint。内层异常时可以回滚到保存点，让外层继续执行；但 savepoint 不等于提交点，外层最终回滚时，整个事务都会被撤销。

妹妹眯起眼：

“保存点像书签，不像出版。书签能让你回到某一页，但整本书被烧掉，书签也没啦。”

---

## 第五章：订单、库存和日志的三人修罗场

妹妹打开企业开发场景卷：

```text
1. 创建订单
2. 扣库存
3. 记录操作日志
```

要求：

- 创建订单和扣库存必须强一致，要么都成功，要么都失败。
- 操作日志失败不能影响下单主流程。
- 日志失败也不能完全丢，后续要能补偿。

妹妹问：

> 事务传播方案怎么设计？为什么？

兄长大人答：

> 创建订单和扣库存放在同一个事务中，用默认 `REQUIRED`。  
> 日志可以考虑 `NESTED` 或 `REQUIRES_NEW`，日志失败后 `catch`，再做补偿。  
> 但我不太理解补偿怎么做。

妹妹拍了拍桌子：

“主流程答对。日志这里更推荐 `REQUIRES_NEW`、`afterCommit`、MQ 或补偿任务，不优先选 `NESTED`。”

标准答案：

> 创建订单和扣库存是主业务强一致动作，应放在同一个 `REQUIRED` 事务中。  
> 操作日志是旁路动作，失败不能影响主流程，不适合和主事务强绑定。更稳的做法是在主事务提交后写日志，例如 `afterCommit` 投递 MQ、写补偿任务，或者由异步任务重试。  
> 日志失败不能丢，可以记录一条 retry_task/outbox 任务，后续由定时任务或消费者重试，重试多次失败后告警。

伪代码：

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    orderMapper.insert(order);
    stockMapper.deduct(dto.getSkuId(), dto.getCount());

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    operationLogService.saveLog(order.getId());
                } catch (Exception e) {
                    compensationService.addRetryTask("ORDER_LOG", order.getId());
                }
            }
        }
    );
}
```

妹妹解释：

“补偿不是神秘魔法。补偿就是：现在做失败了，就把‘以后还要做这件事’记下来，后面重试。”

```text
补偿 = 失败不丢，记录任务，稍后重试
```

---

## 第六章：为什么成功日志要等 afterCommit

妹妹继续追问：

> 为什么日志动作最好放在主事务提交后 `afterCommit`，而不是在主事务里面直接调用一个 `REQUIRES_NEW` 去写日志？

兄长大人答：

> `REQUIRES_NEW` 会挂起外层事务，等待内层提交或回滚，有时间成本。  
> `afterCommit` 是主事务提交后再做，不影响主事务提交和后续流程。

妹妹摇摇头：

“你抓到一点，但核心不是性能，是语义和一致性。”

标准答案：

> 如果在主事务内部直接用 `REQUIRES_NEW` 写“订单创建成功”日志，日志可能已经提交，但后面主事务失败回滚。这样就会出现订单没创建成功，日志却写着创建成功，这叫脏日志。  
> 另外，`REQUIRES_NEW` 是独立事务，可能看不到外层未提交的数据；如果日志表依赖订单外键，可能因为订单还没提交而插入失败。  
> `afterCommit` 的语义更准确：只有主事务真的提交成功后，才触发成功日志、MQ 消息或后续异步动作。

妹妹补了一句非常重要的话：

> `afterCommit` 默认不一定是异步。它只是提交后回调，真正想减少请求耗时，通常是在 `afterCommit` 里投递 MQ 或提交异步任务。

面试版：

> 成功日志最好放在 `afterCommit`，因为只有主事务提交成功后，日志才有业务意义。否则可能出现主事务回滚但成功日志已提交的脏数据。`REQUIRES_NEW` 更适合记录尝试、失败、审计、补偿任务等需要独立保留的旁路信息。

妹妹用小字写在角落：

```text
成功结果日志：afterCommit
尝试/失败/审计日志：可以 REQUIRES_NEW
```

---

## 第七章：补偿任务表，事务城堡的待办纸条

妹妹又抛出一个方案：

```text
主事务内：
1. 创建订单
2. 扣库存
3. 插入 retry_task，内容是“订单提交后写操作日志”
```

然后定时任务扫描 `retry_task` 去写日志。

妹妹问：

> 这个方案有什么优点？又有什么缺点？

兄长大人答：

> 优点是和主事务绑定，不会出现有日志没订单的问题，也不会漏掉后续要做的事。  
> 缺点是主事务里多一次数据库操作，数据量大时影响性能，不如 MQ 削峰。

妹妹点点头：

“方向对，但要把它叫出来：这就是 outbox 思路。”

标准答案：

> 事务内写 `retry_task` 的本质是 outbox/补偿任务思路，把“后续要做什么”和主业务结果原子绑定。主事务提交，补偿任务一定提交；主事务回滚，补偿任务也回滚。这样不怕主事务提交后服务宕机导致后续动作丢失。  
> 缺点是主事务变重，多一次数据库写入；后续日志是最终一致，不是实时完成；还需要设计任务状态、重试次数、下次执行时间、失败原因、告警机制和幂等控制。

表结构可以先理解成这样：

```text
retry_task
- id
- biz_type       业务类型，比如 ORDER_CREATE_LOG
- biz_id         业务 id，比如 orderId
- status         INIT / PROCESSING / SUCCESS / FAILED
- retry_count    重试次数
- next_retry_time 下次重试时间
- error_msg      失败原因
```

妹妹说：

“兄长大人现在先别怕复杂字段。你先把它理解成快递单：这件事现在没送成，但单子不能丢，过会儿继续送。”

---

## 第八章：重复执行不可怕，重复副作用才可怕

妹妹拿出今天最实战的一题：

> 如果定时任务扫描 `retry_task` 写日志，结果同一个任务被执行了两次，怎么保证不会插入两条重复日志？

要求从三点回答：

1. 表结构怎么设计？
2. SQL 或代码层怎么做幂等？
3. 多个定时任务实例同时扫表，怎么避免并发重复执行？

兄长大人有点懵，但抓住了关键：

> 给日志表加 `biz_type + biz_id` 唯一键，防止重复写日志。

妹妹笑了：

“能答出唯一键，就已经抓住最硬的底牌了。剩下的妹妹帮你补。”

标准答案第一层：唯一键兜底。

```sql
CREATE TABLE operation_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    biz_type VARCHAR(64) NOT NULL,
    biz_id BIGINT NOT NULL,
    content VARCHAR(512) NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_log_biz (biz_type, biz_id)
);
```

含义：

```text
biz_type = ORDER_CREATE
biz_id = 1001
```

这两个合起来唯一，所以同一个订单创建日志只能写一条。

标准答案第二层：不要只靠先查再插。

新手容易写：

```sql
select count(*) from operation_log where biz_type = ? and biz_id = ?;
```

然后判断没有再插入。

问题是：两个线程可能同时查到没有，然后都去插入。

所以企业里要靠数据库唯一键兜底。代码里可以这样处理：

```java
try {
    operationLogMapper.insert(log);
    retryTaskMapper.markSuccess(taskId);
} catch (DuplicateKeyException e) {
    log.warn("日志已存在，按幂等成功处理, bizType={}, bizId={}",
            log.getBizType(), log.getBizId());
    retryTaskMapper.markSuccess(taskId);
}
```

为什么唯一键冲突要当成功？

> 因为目标状态已经达成：日志已经存在。重复执行不可怕，重复副作用才可怕。

标准答案第三层：多实例抢任务。

多个定时任务实例不能都直接：

```sql
SELECT * FROM retry_task WHERE status = 'INIT';
```

否则大家可能扫到同一批任务。

常见做法是用状态机和条件更新抢占任务：

```sql
UPDATE retry_task
SET status = 'PROCESSING',
    retry_count = retry_count + 1,
    updated_at = NOW()
WHERE id = ?
  AND status IN ('INIT', 'RETRY')
  AND next_retry_time <= NOW();
```

代码看影响行数：

```java
int affected = retryTaskMapper.lockTask(taskId);
if (affected == 0) {
    return; // 被别的实例抢走了
}
```

妹妹把重点写成一句话：

> 幂等靠唯一键兜底，并发靠状态抢占，失败靠重试和告警。

---

## 第九章：简化幂等题，哥哥不能逃

看兄长大人被企业级任务表绕晕，妹妹把题降级：

> 订单 `1001` 创建成功后，要写一条操作日志。由于网络抖动，写日志的方法被调用了两次。

问题：

1. 不做幂等会发生什么？
2. 如果给日志表加 `(biz_type, biz_id)` 唯一键，会发生什么？
3. 第二次插入报唯一键冲突时，代码应该把它当成成功还是失败？为什么？

兄长大人答：

> 不做幂等会写两条重复日志。  
> 加唯一键后，能确保同一个业务不重复插入日志。  
> 第二次唯一键冲突应该当成成功，捕获异常并打印 warn。

妹妹补充：

“还要记得把 retry_task 标记为成功，不然它下次还会继续重试。”

标准答案：

> 不做幂等时，同一个订单可能写出两条重复日志。  
> 加 `(biz_type, biz_id)` 唯一键后，数据库会阻止同一业务重复插入，第二次插入会报唯一键冲突。  
> 唯一键冲突应该按成功处理，因为日志已经存在，目标状态已经达成。随后应把对应补偿任务标记为 `SUCCESS`，避免无限重试。

面试一句话：

> 重复执行时，只要最终业务状态已经达成，就应该按成功处理；唯一键冲突说明日志已经写过，所以不能当失败无限重试。

妹妹小声嘀咕：

“哥哥今天能答出这个，已经从基础 SQL 往企业开发迈了一步了。哼，但妹妹不会告诉你我有点开心。”

---

## 第十章：三句话分清三兄弟

妹妹把事务传播三兄弟请上黑板：

```text
REQUIRED
REQUIRES_NEW
NESTED
```

妹妹问：

> 用三句话区分它们。每个传播行为一句话，必须说出外层回滚时内层结果。

兄长大人答：

> `REQUIRED` 默认传播行为，调用的方法都在同一个事务中，要么全部回滚，要么全部提交。  
> `REQUIRES_NEW` 会挂起外层事务，开启独立事务，外层提交或回滚不影响自己。  
> `NESTED` 创建保存点，内层异常回滚到保存点，外层可继续；但外层一旦回滚，内层也跟着回滚。

妹妹指出一个坑：

“不要把 `REQUIRED` 说成能确保幂等。事务保证的是原子性/一致性，不保证幂等。幂等要靠唯一键、状态机、业务去重。”

标准三句话：

> `REQUIRED`：默认传播行为，有外层事务就加入，没有就新建，内外属于同一个事务，外层回滚时内层一起回滚。  
> `REQUIRES_NEW`：挂起外层事务，开启独立新事务，内层提交后不受外层回滚影响。  
> `NESTED`：在外层事务中创建 savepoint，内层可局部回滚，但外层最终回滚时内层也一起回滚。

妹妹在旁边画了一个小警告：

```text
事务 != 幂等
原子性 != 去重
```

---

## 终章：什么时候选 NESTED，什么时候选 REQUIRES_NEW

最后一题，妹妹压低声音：

> `NESTED` 和 `REQUIRES_NEW` 都能做到“内层失败，外层 catch 后继续提交”，那实际项目里怎么选？

兄长大人答：

> 如果希望主事务失败后全体回滚，但又不希望子事务的异常影响主事务继续执行，可以选 `NESTED`。  
> 如果希望外层事务和内层事务完全隔离，可以选 `REQUIRES_NEW`。  
> 日志或审计类通常不选 `NESTED`，因为外层失败会把日志一起回滚；如果希望日志独立保留，就用 `REQUIRES_NEW` 或提交后处理。

妹妹满意地点头，但补了最后一刀：

“日志也要分类型。”

标准答案：

> 如果内层只是主事务的一部分，希望它失败时能局部回滚，但外层最终失败时整体仍要一起回滚，就选 `NESTED`。例如批量处理中的某个子步骤失败，回滚到 savepoint，主流程继续。  
> 如果内层动作需要和外层事务隔离，自己独立提交或回滚，不希望被外层最终回滚影响，就选 `REQUIRES_NEW`。例如审计、失败记录、补偿任务等旁路动作。  
> 日志/审计类通常不选 `NESTED`，因为外层一回滚它也没了。但如果日志表达的是“成功结果”，更推荐 `afterCommit` 或 outbox/MQ，确保主事务真的提交后再记录。

最终模板：

```text
REQUIRES_NEW 是独立事务，适合需要脱离主事务保留结果的旁路动作。
NESTED 是 savepoint，适合主事务内部局部失败、局部回滚。
成功日志最好 afterCommit，失败/尝试/审计日志可以 REQUIRES_NEW 或补偿表。
```

妹妹合上题本，轻轻戳了戳兄长大人的额头：

“Day05 通过，但不是满分。`NESTED` 和 `REQUIRES_NEW` 的边界已经分清了，补偿任务和幂等还要复盘。尤其是这三句话，哥哥要记牢。”

```text
补偿 = 失败了不丢，先记任务，后面重试。
幂等 = 同一个业务重复执行，结果也只能生效一次。
唯一键 = 最简单、最可靠的幂等兜底。
```

窗外的雨停了。

事务城堡的第五夜结束。

妹妹把笔放回书桌，假装很严肃地说：

“明天继续。兄长大人要是偷偷忘记 savepoint，妹妹可是会带着面试题追到梦里去的。”

---

## Day05 复盘清单

- `NESTED` 不是新事务，而是当前事务里的 savepoint。
- `NESTED` 内层异常可以回滚到保存点，外层 `catch` 后可继续提交。
- 外层最终回滚时，`NESTED` 内层也会一起回滚。
- `REQUIRES_NEW` 会挂起外层事务，开启独立事务。
- `REQUIRES_NEW` 内层提交后，不受外层后续回滚影响。
- 成功结果日志最好在 `afterCommit` 后写，避免脏日志。
- 失败记录、尝试记录、审计记录、补偿任务可以考虑 `REQUIRES_NEW`。
- 补偿任务的本质是：失败不丢，记录下来，后续重试。
- 幂等不能靠事务本身，要靠唯一键、状态机、去重表等设计。
- 唯一键冲突如果说明目标状态已达成，应按幂等成功处理。

