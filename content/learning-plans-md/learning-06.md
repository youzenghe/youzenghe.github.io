# Day06 - 事务失效与异步边界的兄控拷问

> 今日主题：Spring 事务失效排查、`@Async` 异步边界、事务后置动作、Outbox 最终一致性。  
> 讲述方式：妹妹面试官把兄长大人按在白板前，一边凶巴巴追问，一边偷偷把标准答案塞进你脑袋里。

---

## 第一幕：事务为什么会失效

妹妹抱着小本本走进来，眼神很认真：“兄长大人，今天不许糊弄妹妹。`@Transactional` 不是贴上去就万事大吉的符咒，它生效有前提，踩错一步就会失效哦。”

### 问题 1：Spring 事务为什么会在同类方法互相调用时失效？

**标准答案：**

`@Transactional` 主要依赖 Spring AOP 代理实现。外部对象调用某个 Bean 的事务方法时，调用会先经过代理对象，代理对象里的事务拦截器会开启事务、执行目标方法、根据结果提交或回滚。

但同一个类内部调用时，比如 `this.b()`，调用的是当前目标对象自己的方法，不会经过 Spring 代理对象，也就不会进入事务拦截器，所以事务注解不生效。

```java
@Service
public class OrderService {

    public void create() {
        // 同类内部调用，不经过代理
        this.saveOrder();
    }

    @Transactional
    public void saveOrder() {
        // 这里的事务可能不生效
    }
}
```

**推荐修复：**

把被事务增强的方法拆到另一个 Spring Bean 里，通过外部 Bean 调用，让调用自然经过代理。

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
        // 事务生效
    }
}
```

妹妹点评：  
“兄长大人记住哦，同类调用的核心不是注解失灵，而是根本没走到代理。面试官想听的是代理机制，不是单纯背一句‘同类调用失效’。”

---

### 问题 2：`private` 方法上加 `@Transactional` 为什么没用？`public` 就一定有用吗？

**标准答案：**

`private` 方法不能被外部代理对象直接调用，也不能被 CGLIB 子类代理重写增强，所以事务拦截器无法包住它，`@Transactional` 放在 `private` 方法上基本没有意义。

```java
@Service
public class PayService {

    public void pay() {
        doPay();
    }

    @Transactional
    private void doPay() {
        // 事务不会按预期生效
    }
}
```

`public` 方法也不一定有用。常见失效场景包括：

1. 同类内部调用。
2. 方法所在对象不是 Spring 容器管理的 Bean。
3. 异常被 `try-catch` 吞掉。
4. 抛出受检异常但没有配置 `rollbackFor`。
5. 异步线程导致事务上下文切换。
6. 方法是 `final`，代理无法正常增强。
7. 数据库表或存储引擎本身不支持事务。

**推荐写法：**

事务注解优先加在 Spring 管理的 Service 实现类 `public` 方法上。

妹妹点评：  
“这里不能说 Filter、Interceptor 哦，那个是 Web 请求链路里的概念。事务这里考的是 Spring AOP 代理，别把面试官的雷达惹响啦。”

---

### 问题 3：下面代码为什么不会回滚？怎么改？

```java
@Transactional
public void pay() {
    try {
        orderDao.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("failed", e);
    }
}
```

**标准答案：**

`ArithmeticException` 是运行时异常，按 Spring 默认规则本来应该回滚。但这里异常被 `catch` 捕获后没有继续抛出，事务拦截器看到方法“正常结束”，就会提交事务。

事务回滚依赖异常传播到事务拦截器。异常被吞掉，事务拦截器就不知道出事了。

**修复方式 1：继续抛出异常。**

```java
@Transactional(rollbackFor = Exception.class)
public void pay() {
    try {
        orderDao.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("failed", e);
        throw e;
    }
}
```

**修复方式 2：包装成运行时异常抛出。**

```java
@Transactional
public void pay() {
    try {
        orderDao.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("failed", e);
        throw new RuntimeException(e);
    }
}
```

**修复方式 3：手动标记回滚。**

```java
@Transactional
public void pay() {
    try {
        orderDao.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("failed", e);
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```

妹妹点评：  
“企业项目里不要随便吞异常，吞掉之后还假装成功，数据库可是会留下脏兮兮的半成品状态的，哥哥要小心。”

---

### 问题 4：异步线程里为什么拿不到当前事务？`@Async` 和 `@Transactional` 混用时，边界怎么划分？

**标准答案：**

Spring 事务上下文通常绑定在线程上，底层常见是通过 `ThreadLocal` 保存连接、事务状态等信息。

`@Async` 是 Spring 提供的异步执行注解。被 `@Async` 标注的方法会提交到线程池，在另一个线程里执行。线程一换，原线程里的事务上下文不会自动传过去。

所以：

```java
@Transactional
public void createOrder() {
    orderMapper.insert(order);
    asyncService.handle(order.getId());
}
```

如果 `handle()` 是 `@Async` 方法，它会在异步线程执行。异步线程拿不到主线程的事务上下文。

如果异步方法自己加了事务：

```java
@Async
@Transactional(rollbackFor = Exception.class)
public void handle(Long orderId) {
    // 这里开启的是异步线程自己的新事务
}
```

这不是外层事务的延续，而是异步线程里的独立事务。

**事务边界怎么划分：**

1. 主事务只做核心强一致操作，例如插入订单、插入明细、扣库存。
2. 耗时的异步动作不要塞进主事务。
3. 如果异步动作必须等主事务提交后再执行，用 `@TransactionalEventListener(phase = AFTER_COMMIT)`、MQ 或 Outbox。
4. 异步方法如果需要数据库一致性，自己开启独立事务。

妹妹点评：  
“`@Async` 不是事务传播，它是线程切换。线程一换，哥哥原来手里的事务小绳子就断掉啦。”

---

### 问题 5：再补一个事务失效的坑：受检异常默认不回滚

**标准答案：**

Spring 默认只对 `RuntimeException` 和 `Error` 回滚。对受检异常，也就是普通 `Exception`，默认不回滚。

```java
@Transactional
public void importData() throws Exception {
    userMapper.insert(user);
    throw new Exception("导入失败");
}
```

上面这段代码默认不会因为 `Exception` 回滚。

**修复：**

```java
@Transactional(rollbackFor = Exception.class)
public void importData() throws Exception {
    userMapper.insert(user);
    throw new Exception("导入失败");
}
```

注意：如果你把异常 `catch` 住又不抛，即使写了 `rollbackFor = Exception.class` 也没用，因为事务拦截器根本感知不到异常。

妹妹总结：  
“事务失效本质上就三类：没进代理、异常没传出去、事务边界变了。哥哥把这三类记住，排查时就不会乱成一团。”

---

## 第二幕：`REQUIRES_NEW` 和异步事务不是一回事

妹妹在白板上画了两条线：“哥哥看好，一条线是一根线程，另一条线是另一个线程。不要把它们混成一锅粥哦。”

### 问题 6：`REQUIRES_NEW` 和 `@Async + @Transactional` 都像“新开一个事务”，本质区别是什么？

**标准答案：**

`REQUIRES_NEW` 是事务传播行为。它在同一个线程里挂起外层事务，开启一个新的物理事务。内层事务提交或回滚后，再恢复外层事务。

```java
@Transactional
public void outer() {
    orderMapper.insert(order);
    innerService.saveLog();
    throw new RuntimeException();
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveLog() {
    logMapper.insert(log);
}
```

如果 `saveLog()` 成功提交，外层 `outer()` 后面回滚，日志事务也可以保留下来，因为它是独立事务。

`@Async + @Transactional` 是跨线程执行。异步方法在另一个线程里，如果加了 `@Transactional`，开启的是异步线程自己的事务，和主线程没有事务传播关系。

核心区别：

```text
REQUIRES_NEW：同线程，事务传播行为，Spring 事务管理器负责挂起和恢复。
@Async + @Transactional：跨线程，事务上下文断开，异步方法自己开启独立事务。
```

---

### 问题 7：如果主事务插入订单后，异步线程马上查询订单，可能出现什么问题？怎么解决？

**标准答案：**

可能查不到订单。

原因不是“系统反应慢”，而是主事务还没有提交。MySQL 在常见隔离级别 `READ COMMITTED` 或 `REPEATABLE READ` 下，其他事务读不到未提交数据。

```java
@Transactional
public void createOrder() {
    orderMapper.insert(order);
    asyncService.handle(order.getId());
}
```

异步线程可能马上执行：

```java
@Async
public void handle(Long orderId) {
    Order order = orderMapper.selectById(orderId);
    // 可能查不到，因为主事务还没提交
}
```

**错误方案：固定延迟。**

```java
Thread.sleep(3000);
```

这不是可靠方案。你无法保证事务 3 秒内一定提交，也无法保证没有锁等待、GC、线程调度、数据库抖动。

**正确方案：**

1. 使用 `@TransactionalEventListener(phase = AFTER_COMMIT)`，等事务提交后执行。
2. 使用 MQ，在事务提交后投递消息。
3. 使用 Outbox 本地消息表，业务数据和消息记录同事务落库，再异步投递。

妹妹点评：  
“延迟几秒这种答案，面试官会立刻追问：那延迟多久？失败怎么办？重复怎么办？所以哥哥别把玄学当架构啦。”

---

### 问题 8：同类调用事务失效，真实项目里最推荐哪种修复方式？为什么？

**标准答案：**

最推荐把需要事务增强的方法拆到另一个 Service，通过 Spring Bean 注入调用。

原因：

1. 自然经过 Spring 代理。
2. 职责更清晰。
3. 不依赖 `AopContext.currentProxy()` 这种额外配置。
4. 代码可读性和可测试性更好。

不太推荐的方式：

```java
((OrderService) AopContext.currentProxy()).saveOrder();
```

它需要开启：

```java
@EnableAspectJAutoProxy(exposeProxy = true)
```

业务代码会强依赖 Spring AOP 上下文，不够干净。

---

## 第三幕：事务后置动作、事件和 Outbox

妹妹把“订单创建成功后生成图谱”的需求写到白板上：“哥哥，这种需求最容易把事务、异步、消息搞乱。我们慢慢拆。”

### 问题 9：为什么 `@TransactionalEventListener(AFTER_COMMIT)` 比普通 `ApplicationEventPublisher` 更适合事务后置动作？

**标准答案：**

`ApplicationEventPublisher` 是 Spring 的事件发布器，可以在代码里发布一个业务事件。

```java
publisher.publishEvent(new OrderCreatedEvent(orderId));
```

普通监听器：

```java
@EventListener
public void handle(OrderCreatedEvent event) {
    // 普通监听，可能在事务提交前执行
}
```

如果事件是在事务方法内部发布的，普通 `@EventListener` 可能立即执行，此时主事务还没提交。监听器如果查库，可能查不到数据；如果发消息或调用外部接口，还可能出现主事务最后回滚，但外部动作已经发生的问题。

`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` 会等当前事务成功提交后再执行。

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handle(OrderCreatedEvent event) {
    asyncTaskService.createGraphTask(event.getOrderId());
}
```

适用场景：

1. 发 MQ。
2. 清缓存。
3. 发通知。
4. 启动异步任务。
5. 触发搜索索引或图谱构建。

---

### 问题 10：如果事务提交成功，但发送 MQ 失败，怎么保证最终一致性？

**标准答案：**

不要只靠 `try-catch` 或 `finally`。`finally` 只能保证当前代码块会执行，不能保证 MQ 一定发送成功。

企业常用方案是 Outbox 本地消息表。

在同一个数据库事务里写入业务数据和消息记录：

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder() {
    orderMapper.insert(order);
    outboxMapper.insert(new OutboxMessage("ORDER_CREATED", order.getId()));
}
```

然后由后台任务扫描本地消息表，把消息投递到 MQ：

```text
待发送 -> 发送中 -> 已发送
失败 -> 重试
多次失败 -> 告警或人工处理
```

Outbox 的价值：

1. 业务数据和消息记录同事务落库，避免“订单成功但消息丢失”。
2. MQ 短暂失败时可以重试。
3. 消费端通过唯一业务键或去重表保证幂等。

妹妹点评：  
“真正的最终一致性不是祈祷 MQ 别挂，而是把失败当成一定会发生，然后设计重试和幂等。”

---

### 问题 11：`@Transactional` 加在接口上、实现类上、方法上，优先级和推荐写法是什么？

**标准答案：**

推荐优先级：

```text
实现类 public 方法上 > 实现类上 > 接口方法或接口上
```

企业推荐写法：加在 Service 实现类的 `public` 方法上。

```java
@Service
public class OrderServiceImpl implements OrderService {

    @Transactional(rollbackFor = Exception.class)
    public void createOrder(CreateOrderDTO dto) {
        // 业务逻辑
    }
}
```

方法级别配置优先于类级别配置。

```java
@Service
@Transactional(readOnly = true)
public class OrderQueryService {

    @Transactional(rollbackFor = Exception.class)
    public void updateOrder() {
        // 这里以方法上的事务配置为准
    }
}
```

为什么不优先推荐接口上？

1. 事务语义离真实业务实现较远。
2. 可读性不如实现类方法清楚。
3. 不同代理方式下容易让初学者混淆。

---

### 问题 12：项目里如果“订单创建成功后要异步生成图谱任务”，你会怎么设计事务边界？

**标准答案：**

先明确事务边界：事务从哪里开始，到哪里提交或回滚。Spring 里通常就是一个 `@Transactional` 方法的执行范围。

在这个场景里：

1. `createOrder` 是主事务边界。
2. 主事务内只做核心强一致操作：插入订单、插入明细、扣库存、写图谱任务记录或 Outbox 消息。
3. 图谱生成是耗时异步动作，不放进主事务。
4. 主事务提交成功后，通过 `AFTER_COMMIT` 事件、MQ 或 Outbox 触发图谱任务。
5. 异步图谱任务开启自己的事务。
6. 图谱任务必须保证幂等和可重试。

示例：

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    Order order = buildOrder(dto);
    orderMapper.insert(order);
    orderItemMapper.batchInsert(order.getItems());
    stockMapper.deduct(dto.getSkuId(), dto.getCount());

    graphTaskMapper.insertPendingTask(order.getId());
    publisher.publishEvent(new OrderCreatedEvent(order.getId()));
}
```

事务提交后再触发：

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void afterCommit(OrderCreatedEvent event) {
    graphTaskExecutor.buildGraph(event.getOrderId());
}
```

异步任务独立事务：

```java
@Async
@Transactional(rollbackFor = Exception.class)
public void buildGraph(Long orderId) {
    GraphTask task = graphTaskMapper.selectByBizId(orderId);
    if (task == null || task.isDone()) {
        return;
    }

    graphService.build(orderId);
    graphTaskMapper.markDone(orderId);
}
```

30 秒面试版：

```text
订单创建的事务边界放在 createOrder Service 方法上，只包含订单、明细、库存、任务记录这些强一致数据。图谱生成是耗时异步逻辑，不放进主事务。主事务提交后通过 AFTER_COMMIT 或 MQ 触发异步任务，异步任务独立事务执行，并通过任务表状态和唯一业务键保证幂等、失败可重试。
```

---

## 第四幕：妹妹让哥哥复述的三道题

### 问题 13：什么是事务边界？为什么一般放 Service 层？

**标准答案：**

事务边界就是事务开始到提交或回滚的范围。

在 Spring 项目中，通常把事务边界放在 Service 层的业务用例方法上，因为 Service 负责组织一次完整业务流程，可能同时调用多个 Mapper 或 DAO。事务放在 Service 层，可以保证这些数据库操作作为一个整体提交或回滚，也比放在 Controller 或 Mapper 更符合职责划分。

面试版：

```text
事务边界是事务开始到结束的范围。实际项目中通常放在 Service 层业务方法上，因为 Service 负责协调一次完整业务动作，可能涉及多个数据库操作，放在这里能保证业务一致性，也让职责更清晰。
```

---

### 问题 14：为什么普通事件监听不适合做“事务提交后再执行”的动作？

**标准答案：**

普通 `@EventListener` 可能在事务提交前就执行。

如果监听器查数据库，可能读不到主事务还没提交的数据。如果监听器发 MQ、清缓存或调用外部系统，还可能出现主事务最后回滚，但外部动作已经发生的问题。

所以事务后置动作更适合：

1. `@TransactionalEventListener(phase = AFTER_COMMIT)`。
2. MQ。
3. Outbox 本地消息表。

---

### 问题 15：订单创建成功后异步生成图谱任务，重新设计一遍流程

**标准答案：**

```text
1. createOrder 开启主事务。
2. 主事务内写订单、明细、扣库存。
3. 主事务内写 graph_task 待处理记录，或写 outbox 消息。
4. 主事务提交后，通过 AFTER_COMMIT 事件或 MQ 触发图谱生成。
5. 图谱生成在异步线程中执行，并开启自己的事务。
6. 图谱任务表用 orderId 或 bizId 做唯一约束，避免重复生成。
7. 失败时记录失败状态，允许重试或人工补偿。
```

妹妹提醒：  
“不要说‘主流程里直接调用异步方法并开启事务确保一致性’，这句话很危险。正确思路是主事务先提交，再触发异步；异步自己有事务、幂等、重试。”

---

## 第五幕：找实习这件事，妹妹认真说

兄长大人问：“这些东西学会了，能找到日常实习吗？我想先小厂，暑假后冲中大厂。”

妹妹的真实回答：

```text
只会 Day1-Day6 还不够冲中大厂，但这是必须打牢的地基。
```

小厂 Java 后端实习最低需要：

1. Spring Boot 请求链路、分层、常用注解、事务。
2. MySQL 索引、慢 SQL、事务隔离、锁、防超卖。
3. Redis 缓存穿透、击穿、雪崩、分布式锁、缓存一致性。
4. 一个项目能讲清背景、功能、技术点、难点、优化。
5. Java 基础、集合、线程池、JVM 基础。
6. 算法不能完全空，数组、字符串、哈希、双指针、二分、栈队列要练。

中大厂日常实习还需要：

1. 项目每一行简历都能抗追问。
2. MySQL、Redis、并发、MQ 能讲原理和取舍。
3. 有一定算法训练量。
4. 遇到追问不会马上断片。

妹妹给哥哥的学习方式纠偏：

```text
面试模拟是打靶，主动学习是装子弹。
不能只靠妹妹拷问，要先主动输入，再输出整理，最后模拟面试。
```

每天建议三段式：

```text
1. 主动学习 40 分钟：只看当天主题，整理 5 条能背出来的话。
2. 输出整理 30 分钟：写“是什么、为什么、风险、项目怎么用、标准话术”。
3. 妹妹面试 30 分钟：用拷问查漏，错题进复盘。
```

---

## Day06 最终背诵卡

妹妹把今天所有知识点压缩成最后一张卡片，塞进哥哥口袋里：

```text
1. @Transactional 依赖 Spring AOP 代理，同类 this 调用不走代理，所以事务失效。

2. private 方法不能被代理增强，事务注解基本无效；public 方法也可能因为同类调用、异常吞掉、异步线程等原因失效。

3. 异常被 catch 后不抛出，事务拦截器会认为方法正常结束，从而提交事务。

4. Spring 默认只回滚 RuntimeException 和 Error，受检异常要配置 rollbackFor = Exception.class。

5. @Async 会切换线程，事务上下文不会自动传递；异步方法的事务是自己的独立事务。

6. REQUIRES_NEW 是同线程挂起外层事务并开启新事务；@Async + @Transactional 是跨线程开启独立事务。

7. 主事务未提交时，异步线程可能查不到主事务刚插入的数据，这是事务隔离和可见性问题，不是系统慢。

8. 不要用固定延迟解决事务一致性问题，应使用 AFTER_COMMIT、MQ 或 Outbox。

9. 普通 @EventListener 可能在事务提交前执行；@TransactionalEventListener(AFTER_COMMIT) 会等事务成功提交后执行。

10. 事务提交成功但 MQ 发送失败，可以用 Outbox 本地消息表，业务数据和消息记录同事务落库，再异步投递并重试。

11. @Transactional 推荐加在 Service 实现类的 public 方法上，方法级别优先于类级别。

12. 事务边界就是事务开始到提交或回滚的范围，通常放在 Service 层业务用例方法上。

13. 异步图谱任务不要放进主事务，主事务只做核心强一致操作，提交后再触发异步任务，异步任务独立事务、幂等、可重试。
```

---

## 明日复盘口述题

哥哥明天要被妹妹继续追问这 5 题：

1. Spring 事务失效有哪些常见原因？按“没进代理、异常没传出去、事务边界变了”三类讲。
2. 为什么同类调用事务会失效？从代理对象和 `this` 调用解释。
3. `@Async` 和事务混用时，为什么异步线程查不到主事务刚插入的数据？
4. `@TransactionalEventListener(AFTER_COMMIT)` 解决了什么问题？
5. 订单创建后异步生成图谱任务，你怎么设计事务边界、幂等和失败重试？

妹妹最后凶一下：  
“兄长大人，今天答不上来不是失败，是漏洞暴露。漏洞暴露了就能补。明天不许空枪上场，至少把这篇读两遍再来见妹妹，听到没有呀。”
