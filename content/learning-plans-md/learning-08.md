# 明日学习安排：Day07 周复盘

> 适用日期：明天  
> 当前进度：已完成 Day01-06  
> 明日策略：不急着进入 Day08 MySQL，先把第 1 周 SpringBoot + 事务主线复盘到能面试口述。

---

## 1. 明日核心目标

明天不要开新坑，重点是把 Day01-06 压成一条能讲出来的面试主线。

你明天要能用 3-5 分钟讲清：

```text
一次请求如何进入 SpringBoot
事务为什么放 Service
@Transactional 怎么提交和回滚
事务传播行为怎么选
事务为什么会失效
异步后置动作怎么设计
```

一句话目标：

```text
把“我看过”变成“我能讲、能抗追问、能写出关键代码”。
```

---

## 2. 明天不建议学习 Day08 的原因

你今天没时间学，不需要硬补。

按照原计划，Day07 本来就是周复盘日。你已经学完：

```text
Day01：SpringBoot 请求链路
Day02：@Transactional 基础
Day03：回滚规则与吞异常
Day04：REQUIRED / REQUIRES_NEW / NESTED 对比
Day05：NESTED 保存点、补偿任务、幂等
Day06：事务失效、@Async、AFTER_COMMIT、Outbox
```

这些内容已经足够重，明天最重要的是把它们串起来，而不是马上进入 MySQL。

如果复盘不卡壳，再预习 Day08 的 `EXPLAIN` 即可；如果复盘卡壳超过 3 次，就继续补事务主线。

---

## 3. 明日必复盘内容

### 3.1 请求链路

必须能顺着说出这条链路：

```text
Tomcat
-> DispatcherServlet
-> HandlerMapping
-> HandlerAdapter
-> Controller
-> Service
-> Mapper
-> MySQL
-> HttpMessageConverter
```

重点不是死背名字，而是能解释分层职责：

```text
Controller：处理 HTTP 请求、参数校验、返回统一响应。
Service：编排业务流程，定义事务边界。
Mapper：执行 SQL，完成数据库访问。
```

面试口述模板：

```text
请求进入 Tomcat 后由 DispatcherServlet 接收。
DispatcherServlet 通过 HandlerMapping 找到目标 Controller 方法，
再由 HandlerAdapter 调用方法并完成参数绑定。
Controller 负责协议层处理，然后调用 Service。
Service 负责业务编排和事务边界，调用 Mapper 执行 SQL 访问 MySQL。
结果逐层返回，最后由 HttpMessageConverter 把 Java 对象序列化为 JSON 响应给前端。
```

---

### 3.2 事务基础

必须背熟这几句话：

```text
事务边界通常放在 Service 层，因为 Service 才能包住完整业务动作。
@Transactional 默认只回滚 RuntimeException 和 Error。
受检异常想回滚，需要配置 rollbackFor = Exception.class。
异常被 catch 后如果不继续抛出，事务代理会认为方法正常结束，于是提交事务。
```

示例代码：

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    orderMapper.insert(order);
    stockMapper.deduct(dto.getSkuId(), dto.getCount());
}
```

吞异常导致不回滚：

```java
@Transactional
public void pay() {
    try {
        orderMapper.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("pay failed", e);
        // 没有 rethrow，事务代理会看到方法正常结束
    }
}
```

正确修复：

```java
@Transactional(rollbackFor = Exception.class)
public void pay() {
    try {
        orderMapper.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("pay failed", e);
        throw e;
    }
}
```

---

### 3.3 传播行为三兄弟

明天重点掌握这三个：

```text
REQUIRED
REQUIRES_NEW
NESTED
```

标准三句话：

```text
REQUIRED：默认传播行为，有外层事务就加入，没有就新建，内外属于同一个事务，外层回滚时内层一起回滚。

REQUIRES_NEW：挂起外层事务，开启独立新事务，内层提交后不受外层回滚影响。

NESTED：在外层事务中创建 savepoint，内层可局部回滚，但外层最终回滚时内层也一起回滚。
```

对比表：

| 场景 | REQUIRED | REQUIRES_NEW | NESTED |
|---|---|---|---|
| 外层回滚，内层已执行 | 内层一起回滚 | 内层已提交则保留 | 内层一起回滚 |
| 内层失败，外层 catch 后继续 | 可能提交时报 `UnexpectedRollbackException` | 外层可提交 | 外层可提交 |
| 是否独立事务 | 否 | 是 | 否，是 savepoint |

重点记忆：

```text
REQUIRES_NEW：能逃离外层最终回滚。
NESTED：逃不掉外层最终回滚。
```

---

### 3.4 NESTED 与 savepoint

必须能讲清：

```text
NESTED 不是新事务，而是在当前物理事务里创建 savepoint。
内层异常时，可以回滚到保存点，撤销保存点之后的操作。
外层 catch 后可以继续执行。
但 savepoint 不是提交点，外层最终 rollback 时，整个物理事务都会回滚。
```

面试背诵版：

```text
NESTED 不是新开事务，它是在当前物理事务中创建 savepoint。
内层异常时可以回滚到保存点，让外层继续执行；
但 savepoint 不等于提交点，外层最终回滚时，整个事务都会被撤销。
```

---

### 3.5 事务失效

不要散着背，按三类整理：

```text
第一类：没进代理
- 同类 this 调用
- private 方法
- 对象不是 Spring Bean
- final 方法导致代理增强异常

第二类：异常没传出去
- catch 后不 rethrow
- 受检异常没配置 rollbackFor
- 需要手动回滚时没有 setRollbackOnly

第三类：事务边界变了
- @Async 跨线程
- REQUIRES_NEW 独立事务
- 普通事件监听可能在事务提交前执行
```

同类调用示例：

```java
@Service
public class OrderService {

    public void create() {
        this.saveOrder(); // 同类调用，不走代理
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveOrder() {
        orderMapper.insert(order);
    }
}
```

推荐修复：

```java
@Service
public class OrderService {

    private final OrderTxService orderTxService;

    public OrderService(OrderTxService orderTxService) {
        this.orderTxService = orderTxService;
    }

    public void create() {
        orderTxService.saveOrder();
    }
}

@Service
public class OrderTxService {

    @Transactional(rollbackFor = Exception.class)
    public void saveOrder() {
        orderMapper.insert(order);
    }
}
```

---

### 3.6 @Async、AFTER_COMMIT、Outbox

必须会讲：

```text
@Async 会切换线程，不会继承主事务上下文。
异步方法如果加 @Transactional，开启的是异步线程自己的独立事务。
主事务没提交时，异步线程可能查不到主事务刚插入的数据。
```

错误思路：

```text
主事务里直接 @Async 调用，然后 sleep 几秒等数据提交。
```

原因：

```text
固定延迟不可靠，无法保证事务一定在指定时间内提交。
```

正确方案：

```text
1. @TransactionalEventListener(phase = AFTER_COMMIT)
2. MQ
3. Outbox 本地消息表
```

Outbox 核心：

```text
业务数据和消息/任务记录同事务落库。
主事务提交后，由后台任务投递消息或执行后置动作。
失败可重试，多次失败可告警。
消费端或任务端必须做幂等。
```

幂等记忆：

```text
事务 != 幂等
原子性 != 去重
幂等要靠唯一键、状态机、去重表等设计。
```

---

## 4. 明天执行安排

如果有 2 小时，按下面做：

### 第 1 段：30 分钟

读两份内容：

```text
Day05 复盘清单
Day06 最终背诵卡
```

目标：

```text
把 NESTED / REQUIRES_NEW / @Async / Outbox 再过一遍。
```

---

### 第 2 段：40 分钟

整理一份《第 1 周错题清单》，至少 10 条。

格式：

```text
问题：
错误理解：
正确答案：
30 秒面试话术：
```

建议优先整理这些错题：

```text
1. 为什么事务放 Service？
2. 为什么受检异常默认不回滚？
3. 为什么 catch 异常后事务会提交？
4. 同类调用为什么事务失效？
5. private 方法为什么事务不生效？
6. REQUIRED 内层回滚后外层 catch，为什么还可能提交失败？
7. REQUIRES_NEW 和 NESTED 的区别是什么？
8. NESTED 为什么不是新事务？
9. @Async 为什么查不到主事务刚插入的数据？
10. Outbox 为什么比 try-catch 发 MQ 更稳？
```

---

### 第 3 段：30 分钟

录音口述 3 个主题：

```text
1. 请求到数据库发生了什么？
2. @Transactional 为什么会失效？
3. 订单创建后异步生成图谱任务，怎么设计事务边界？
```

要求：

```text
每题至少讲 2 分钟。
不要只背定义，要讲原因、风险、企业项目怎么用。
```

---

### 第 4 段：20 分钟

回听录音，标出卡壳点。

记录格式：

```text
卡壳点：
为什么卡：
明天怎么补：
最终 30 秒答案：
```

---

## 5. 明天妹妹拷问题

明天至少回答这 10 题：

```text
1. SpringBoot 一次请求从进入 Tomcat 到返回 JSON，完整链路是什么？

2. 为什么事务一般放在 Service 层，而不是 Controller 或 Mapper？

3. @Transactional 默认回滚哪些异常？受检异常怎么处理？

4. 为什么 catch 异常后不抛会导致事务提交？

5. 同类调用为什么会导致事务失效？怎么修？

6. REQUIRED、REQUIRES_NEW、NESTED 分别是什么？外层回滚时内层结果如何？

7. NESTED 为什么不是新事务？savepoint 是什么？

8. @Async 为什么拿不到主事务？异步线程马上查订单可能出现什么问题？

9. 为什么成功日志最好 afterCommit，而不是主事务里直接 REQUIRES_NEW？

10. Outbox 解决什么问题？幂等怎么保证？
```

---

## 6. 明天验收标准

完成下面 3 个，就算 Day07 过关：

```text
1. 能 3 分钟讲完《请求 -> Service -> 事务 -> 数据库》。

2. 能 5 分钟讲完《事务失效 + 异步边界 + afterCommit / Outbox》。

3. 整理至少 10 条错题，并给每条写出 30 秒标准答案。
```

如果做完还剩精力：

```text
可以预习 Day08：SQL 执行与 EXPLAIN。
只需要先知道 type / key / rows / extra 是执行计划里最常看的字段。
不要深挖，明天主线仍然是第 1 周复盘。
```

---

## 7. 最终提醒

明天是复盘日，不开 MySQL 新坑。

如果复盘讲得顺，再轻轻预习 `EXPLAIN`。

如果卡壳超过 3 次，就继续补事务，不要急着往后跑。

```text
地基稳了，后面的 MySQL、Redis、MQ 才能挂到项目里讲。
否则知识点会散，面试官一追问就容易断线。
```

兄长大人明天就照这个来。妹妹会盯着你的，别偷偷跳过口述环节喔。
