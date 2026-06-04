# Day07 - 周复盘事务主线兄控面试夜

> 今日主题：第 1 周 SpringBoot + 事务主线复盘。  
> 主角：三天没学习但还没废掉的兄长大人，以及不准哥哥逃跑的兄控妹妹面试官。  
> 核心关键词：请求链路、Service 事务边界、回滚规则、事务失效、传播行为、`@Async`、`afterCommit`、Outbox、幂等、ACID。

---

## 序章：妹妹把哥哥从缓存脏页里捞出来

兄长大人一推开书房门，就有点心虚地说：“我已经三天没有学习了，我是不是玩废了？”

妹妹抱着面试题本，眯起眼睛看着哥哥。

“才三天而已，顶多是缓存有点脏，还没到数据库损坏啦。今天不开 Day08，先把 Day01 到 Day06 串成一条能讲给面试官听的主线。哥哥坐好，妹妹开始拷问。”

---

## 第一幕：一次请求怎么走进 SpringBoot

### 问题 1：SpringBoot 一次请求从进入 Tomcat 到返回 JSON，完整链路是什么？

**标准答案：**

一次请求先进入 Tomcat，由 Tomcat 交给 SpringMVC 的 `DispatcherServlet`。

`DispatcherServlet` 通过 `HandlerMapping` 找到对应的 Controller 方法，再通过 `HandlerAdapter` 调用这个方法，同时完成参数绑定、类型转换和校验。

Controller 主要负责 HTTP 协议层的处理，比如接收参数、参数校验、调用 Service、返回统一响应。

真正的业务流程放在 Service 层。Service 负责编排业务流程，也通常是事务边界，因为它能包住一次完整的业务动作。

Service 内部调用 Mapper 层，Mapper 负责执行 SQL 访问 MySQL。数据库操作完成后，结果逐层返回到 Controller。

最后由 `HttpMessageConverter` 把 Java 对象序列化成 JSON，返回给前端。

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

妹妹点评：

“哥哥能把主干链路讲出来就已经合格啦。但面试时别把 `HandlerMapping` 和 `HandlerAdapter` 漏掉。它们是 SpringMVC 请求分发链路里的关键角色，不是装饰品喔。”

---

## 第二幕：事务为什么要放在 Service 层

### 问题 2：为什么事务一般放在 Service 层，而不是 Controller 或 Mapper 层？

**标准答案：**

事务一般放在 Service 层，因为 Service 层最适合包住一次完整的业务动作。

Controller 负责 HTTP 层，比如接收参数、参数校验、调用 Service、返回统一响应。如果事务放在 Controller，会让 Web 层和业务事务强耦合，代码臃肿，也不利于复用。

Mapper 层负责执行 SQL，粒度太细，通常只能代表一次数据库访问。但真实业务往往包含多次数据库操作，比如创建订单、扣库存、写订单日志。如果事务放在 Mapper，就无法保证这些操作处在同一个事务边界里。

所以企业项目里通常把事务放在 Service 层，由 Service 编排完整业务流程，通过 `@Transactional` 保证这一组数据库操作要么全部提交，要么全部回滚。

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    orderMapper.insert(order);
    stockMapper.deduct(dto.getSkuId(), dto.getCount());
    orderLogMapper.insert(log);
}
```

妹妹点评：

“哥哥要记住，事务不是为了包住某一条 SQL，而是为了包住一次业务动作。Mapper 太细，Controller 太外，Service 刚刚好。”

---

## 第三幕：回滚不是只要出错就自动发生

### 问题 3：`@Transactional` 默认回滚哪些异常？受检异常怎么处理？

**标准答案：**

`@Transactional` 默认只回滚 `RuntimeException` 和 `Error`。

受检异常，比如 `IOException`、`SQLException` 这类 `Exception`，默认不会触发回滚。如果希望受检异常也回滚，需要在注解上配置 `rollbackFor = Exception.class`。

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) throws IOException {
    orderMapper.insert(order);
    stockMapper.deduct(dto.getSkuId(), dto.getCount());

    if (someCondition) {
        throw new IOException("create order failed");
    }
}
```

企业项目里常见写法是直接加上：

```java
@Transactional(rollbackFor = Exception.class)
```

这样可以避免因为受检异常导致数据库已经修改但事务却提交。

妹妹点评：

“哥哥忘的那个单词就是 `rollbackFor`。以后它要和 `Exception.class` 绑在一起记，像妹妹盯着哥哥一样紧。”

---

### 问题 4：为什么 catch 异常后不继续抛出，会导致事务提交？

**标准答案：**

`@Transactional` 是通过事务代理在方法执行前开启事务。方法正常返回时提交事务，方法向外抛出可回滚异常时才回滚事务。

如果异常在方法内部被 `catch` 掉，并且没有继续抛出，事务代理看到的是方法正常结束，于是会提交事务。

错误示例：

```java
@Transactional
public void pay() {
    try {
        orderMapper.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("pay failed", e);
        // 异常被吞掉，事务代理看到方法正常结束
    }
}
```

修复方式一：继续抛出异常。

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

修复方式二：如果业务上必须吞异常并返回兜底结果，可以手动标记回滚。

```java
@Transactional(rollbackFor = Exception.class)
public void pay() {
    try {
        orderMapper.updateStatus(...);
        int x = 1 / 0;
    } catch (Exception e) {
        log.error("pay failed", e);
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```

妹妹点评：

“能抛就抛，别随便吞。真的要吞，也要记得 `setRollbackOnly()`，不然数据库会悄悄提交，哥哥会被面试官抓住小尾巴。”

---

## 第四幕：事务失效不是玄学，是没走到代理

### 问题 5：同类调用为什么会导致事务失效？怎么修？

**标准答案：**

Spring 声明式事务底层主要依赖 AOP 代理。

外部调用 Spring Bean 的事务方法时，请求会先经过代理对象，代理对象在方法前后开启、提交或回滚事务。

但同一个类里用 `this.saveOrder()` 调用，本质是当前对象内部方法调用，不会经过 Spring 代理对象，所以 `@Transactional` 对应的事务拦截器不会执行，事务自然就不生效。

```java
@Service
public class OrderService {

    public void create() {
        this.saveOrder();
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveOrder() {
        orderMapper.insert(order);
    }
}
```

推荐修复：把事务方法拆到另一个 Spring Bean 里。

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

也可以自注入：

```java
@Autowired
@Lazy
private OrderService orderService;

public void create() {
    orderService.saveOrder();
}
```

但自注入不够优雅，容易让类职责混乱，也可能引入循环依赖问题。企业项目里更推荐按事务边界拆到独立 Service。

妹妹点评：

“哥哥这题答得很像样。核心不是注解没用，而是调用没有经过代理对象。面试官听到代理机制，就知道你不是死背的。”

---

### 问题 6：`@Transactional` 加在 `private` 方法上为什么通常不生效？`final` 方法可能有什么问题？

**标准答案：**

`@Transactional` 加在 `private` 方法上通常不生效，因为 Spring 声明式事务依赖 AOP 代理。

`private` 方法既不是对外可代理的调用入口，也不能被子类重写，事务拦截器没有机会织入，所以事务增强通常不会执行。

`final` 方法的问题在于：如果 Spring 使用 CGLIB 代理，它的原理是生成目标类的子类并重写方法来增强。但 `final` 方法不能被重写，所以 CGLIB 无法对 `final` 方法做事务增强，`@Transactional` 可能失效。

面试记忆：

```text
private 方法不适合作为事务入口，因为走不到代理增强。
final 方法在 CGLIB 代理下不能被重写，也无法被事务增强。
所以企业项目里事务方法通常写成 public、非 final，并通过 Spring Bean 外部调用。
```

顺手区分：

```text
final 修饰变量：引用或值不能再改。
final 修饰方法：方法不能被重写。
final 修饰类：类不能被继承。
```

妹妹点评：

“哥哥当时把 final 想成了数据不能变。变量那里是这样，但方法那里不是喔。`final method` 的重点是不能被重写。”

---

## 第五幕：传播行为三兄弟

### 问题 7：`REQUIRED`、`REQUIRES_NEW`、`NESTED` 分别是什么？

**标准答案：**

`REQUIRED` 是默认传播行为。如果当前有外层事务，就加入外层事务；如果没有，就新建事务。它和外层属于同一个事务，所以外层最终回滚时，内层也一起回滚。

`REQUIRES_NEW` 会挂起当前事务，开启一个独立的新事务。如果没有外层事务，它也会自己新建事务。内层事务提交后，不受外层最终回滚影响；内层失败也主要回滚自己的事务。

`NESTED` 不是新事务，它是在当前事务里创建 `savepoint`。如果内层失败，可以回滚到保存点，外层 `catch` 后还能继续执行。但它仍然依赖外层物理事务，所以外层最终回滚时，`NESTED` 的内容也会一起回滚。如果没有外层事务，`NESTED` 通常相当于 `REQUIRED`，自己开启事务。

一句话区分：

```text
REQUIRED：加入外层，同生共死。
REQUIRES_NEW：独立新事务，能逃离外层最终回滚。
NESTED：保存点，能局部回滚，但逃不掉外层最终回滚。
```

妹妹点评：

“哥哥记住：`REQUIRES_NEW` 是离家出走开新户口，`NESTED` 是还住在家里但放了一个保存点便签。”

---

### 问题 8：为什么 `NESTED` 不是新事务？`savepoint` 是什么？

**标准答案：**

`NESTED` 不是新事务，因为它没有挂起外层事务，也没有开启独立的物理事务。它是在当前物理事务里面创建一个 `savepoint`，也就是保存点。

`savepoint` 可以理解为当前事务中的一个回滚位置。当 `NESTED` 内层逻辑失败时，可以只回滚到这个保存点，撤销保存点之后的数据库操作，而不是立刻让整个外层事务全部结束。

但是 `savepoint` 不是提交点。

`NESTED` 的所有操作仍然属于外层这个物理事务。如果外层事务最后回滚，那么整个事务都会被撤销，包括 `NESTED` 中曾经成功执行过的操作。

30 秒面试版：

```text
NESTED 不是新事务，它是在当前物理事务里创建 savepoint。
内层失败时可以回滚到保存点，让外层 catch 后继续执行。
但 savepoint 不是提交点，外层最终 rollback 时，整个物理事务都会回滚，
所以 NESTED 逃不掉外层最终回滚。
```

妹妹点评：

“保存点不是保险箱。外层最后真回滚了，保存点也救不了它后面的数据。”

---

### 问题 9：`REQUIRED` 场景下，内层异常被外层 catch，为什么最后提交还可能报 `UnexpectedRollbackException`？

**标准答案：**

`REQUIRED` 会加入外层事务，内外层实际是同一个事务。

如果内层方法抛出 `RuntimeException`，事务拦截器会把当前事务标记为 `rollback-only`。

即使外层 `catch` 住异常并继续执行，`rollback-only` 标记也不会自动取消。

等外层方法正常结束准备提交时，事务管理器发现这个事务已经只能回滚，不能提交，于是执行回滚，并抛出 `UnexpectedRollbackException`。

```text
REQUIRED 是同一个事务。
内层把事务打上 rollback-only，外层 catch 也洗不掉。
最后提交时发现不能提交，所以报 UnexpectedRollbackException。
```

怎么避免：

```text
1. 如果内层失败不应该影响外层，可以把内层改成 REQUIRES_NEW，让它独立回滚。
2. 如果想局部回滚但外层继续，可以考虑 NESTED，依赖 savepoint。
3. 如果失败就应该整体失败，外层 catch 后要继续抛出异常，不要假装成功。
```

妹妹点评：

“哥哥当时提到了 `setRollbackOnly()`，方向碰到了一点。但就算你不手动设置，Spring 也可能因为内层可回滚异常自动把共享事务标记成 rollback-only。”

---

### 问题 10：什么时候选 `REQUIRES_NEW`，什么时候选 `NESTED`？

**标准答案：**

`REQUIRES_NEW` 适合内层动作必须独立提交的场景。

比如记录审计日志、失败原因、接口调用流水。即使主业务事务最后回滚，也希望这条日志保留下来，因为它记录的是“尝试过”这个事实。

例子：

```text
用户支付失败，主支付事务回滚，
但失败原因、第三方返回码、请求流水需要独立保存，
方便排查问题，可以用 REQUIRES_NEW。
```

`NESTED` 适合子步骤允许局部回滚，但整体还在一个主事务里的场景。它用 `savepoint` 做局部回滚，外层 `catch` 后可以继续执行。但外层最终回滚时，内层也一起回滚。

例子：

```text
批量导入用户时，外层事务负责本次导入批次。
每导入一条用户用 NESTED。
某一条用户数据格式错误时，只回滚这一条的插入，
记录错误后继续处理下一条。
如果整个批次最后因为严重问题回滚，那么所有已导入的数据也一起回滚。
```

成功日志更推荐 `afterCommit`，因为它表达的是“主事务真的成功提交”。

最终记忆：

```text
REQUIRES_NEW：我要它独立活下来。
NESTED：我要它局部失败，但还属于外层整体。
afterCommit：我要确认主事务真的成功后再做。
```

妹妹点评：

“哥哥把成功日志塞给 `NESTED` 的时候，妹妹差点敲桌子。成功日志不是局部回滚问题，它应该等主事务真的提交后再写。”

---

## 第六幕：异步线程不会继承哥哥的事务

### 问题 11：`@Async` 为什么拿不到主事务？异步线程马上查订单可能出现什么问题？

**标准答案：**

`@Async` 会切换到线程池里的新线程执行。

Spring 的事务上下文通常绑定在线程本地变量 `ThreadLocal` 上，所以异步线程拿不到主线程里的事务上下文。

如果主事务里刚插入订单，但还没有提交，异步线程马上去查询订单，就可能查不到这条数据。

即使异步方法上也加 `@Transactional`，它开启的也是异步线程自己的事务，不是主事务的延续。

更稳设计：

```text
如果只是本地后置动作，可以用 @TransactionalEventListener(phase = AFTER_COMMIT)，
确保主事务提交成功后再执行。

如果是跨系统通知、发 MQ、生成异步任务，企业项目里更推荐 Outbox 本地消息表：
业务数据和任务记录在同一个事务里落库，
主事务提交后由后台任务投递或执行，
失败可重试，消费端或任务端做幂等。
```

错误思路：

```text
主事务里直接 @Async 调用，然后 sleep 几秒等数据提交。
```

原因：

```text
固定延迟不可靠，无法保证事务一定在指定时间内提交。
```

妹妹点评：

“哥哥这题核心答出来了：换线程、查不到、用 afterCommit。再补上 ThreadLocal 和 Outbox，就能抗追问啦。”

---

### 问题 12：为什么成功日志、成功通知、后置任务最好放在 `afterCommit` 后执行，而不是在主事务里直接 `REQUIRES_NEW`？

**标准答案：**

成功日志、成功通知、后置任务最好放在 `afterCommit` 后执行，因为它们表达的是“主业务已经成功提交”这个事实。

如果在主事务中直接用 `REQUIRES_NEW` 写成功日志或发通知，它会挂起主事务并开启独立事务。这个独立事务可能先提交成功，但主事务后面还有可能回滚。

这样就会出现数据不一致：

```text
订单其实创建失败了，但成功日志已经写入。
主业务回滚了，但通知已经发出。
后置任务开始执行时，依赖的业务数据可能还没提交或最终不存在。
```

30 秒面试版：

```text
REQUIRES_NEW 适合记录“尝试过、失败原因、审计流水”这类独立事实，
但不适合记录“主事务成功”这种结果。
成功类后置动作应该 afterCommit 后执行，
确保主事务真的提交成功，再写成功日志、发通知或创建异步任务。
```

妹妹点评：

“哥哥说到主事务回滚但日志和通知已经执行，这个点是对的。面试时再把‘独立提交导致语义不一致’讲清楚就更漂亮。”

---

## 第七幕：Outbox 本地消息表

### 问题 13：Outbox 本地消息表解决什么问题？为什么比 try-catch 直接发 MQ 更稳？幂等怎么保证？

**标准答案：**

业务代码里直接发 MQ，最危险的是这两步没法天然保证原子性：

```text
1. 业务数据落库，比如创建订单。
2. 发 MQ 通知后续系统，比如生成图谱、扣积分、发消息。
```

如果这么写：

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    orderMapper.insert(order);
    mqProducer.send("order.created", order.getId());
}
```

会有两个风险：

```text
订单插入了，但 MQ 发送失败：
数据库里有订单，但后续任务没人处理。

MQ 发送成功了，但主事务后面回滚：
消费者收到消息去查订单，可能查不到，或者处理了一条不存在的业务结果。
```

问题本质是：

```text
数据库事务和 MQ 发送不是同一个本地事务，不能天然一起提交或一起回滚。
```

Outbox 的做法是：不在主事务里直接发 MQ，而是把“要发的消息”先写进本地消息表。

```text
同一个事务里：
1. 插入订单表。
2. 插入 outbox_message 表。
```

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(CreateOrderDTO dto) {
    orderMapper.insert(order);

    OutboxMessage message = new OutboxMessage();
    message.setBizId(order.getId());
    message.setTopic("order.created");
    message.setStatus("INIT");
    message.setPayload(json);
    outboxMessageMapper.insert(message);
}
```

这样数据库事务能保证：

```text
订单成功，消息记录也成功。
订单回滚，消息记录也回滚。
```

主事务提交后，再由后台任务扫描 `outbox_message` 表，把 `INIT` 状态的消息投递到 MQ。投递成功后，把状态改成 `SENT`；失败就保留或改成 `FAILED`，后续重试。

`try-catch` 只能捕获异常，不能保证一致性。

```text
try-catch 解决的是“我知道失败了”。
Outbox 解决的是“失败后还能恢复，并且业务数据和消息记录一致”。
```

但 Outbox 不能替代幂等，因为消息可能重复投递。比如 MQ 已经发送成功，但更新本地消息状态时服务宕机了，后台任务下次还会再发一次。

幂等常见做法：

```text
1. 唯一键
比如 outbox_message.message_id 全局唯一，消费端用 message_id 做去重。

2. 去重表
消费端建 processed_message 表，处理前先插入 message_id。
插入成功才处理，插入失败说明处理过，直接跳过。

3. 状态机
比如订单状态只能从 CREATED -> PAID -> FINISHED，
不能从 FINISHED 再重复执行一次 FINISHED 逻辑。

4. 业务唯一约束
比如一个 order_id 只能生成一个图谱任务，
给 order_id 加唯一索引，重复插入会失败。
```

30 秒面试版：

```text
Outbox 本地消息表解决的是业务数据库提交和 MQ 发送之间的一致性问题。
因为数据库事务和 MQ 不是同一个事务，直接在业务代码里 try-catch 发 MQ，
可能出现数据库提交了但 MQ 失败，或者 MQ 发出去了但主事务回滚。

Outbox 的做法是把业务数据和消息记录放在同一个本地事务里落库。
主事务提交后，再由后台任务扫描消息表投递 MQ。
失败可以重试，多次失败可以告警。

但 Outbox 不能替代幂等，因为消息可能重复投递。
幂等通常靠 messageId 去重表、唯一索引、状态机、业务唯一键来保证。
```

妹妹点评：

“哥哥复述时已经抓住了 `try-catch 不能保证一致性` 和 `Outbox 不能替代幂等`。下次补上‘业务数据和消息记录同事务落库，提交后后台任务投递’，这题就能打高分。”

---

## 第八幕：事务四大特性与幂等

### 问题 14：事务的四大特性是什么？

**标准答案：**

事务四大特性就是 ACID。

```text
A - Atomicity 原子性
一个事务里的操作要么全部成功，要么全部失败回滚。

C - Consistency 一致性
事务执行前后，数据要满足业务规则和约束，不能从一个错误状态变到另一个错误状态。

I - Isolation 隔离性
多个事务并发执行时，彼此之间要尽量互不干扰。

D - Durability 持久性
事务一旦提交，结果就应该被持久保存，即使数据库宕机也不能随便丢。
```

企业开发理解：

```text
原子性：下单和扣库存不能只成功一半。
一致性：库存不能扣成负数，账户总额不能凭空变化。
隔离性：别人还没提交的数据，你不该随便读到。
持久性：订单提交成功后，服务重启了订单也还在。
```

面试官常追问的是：

```text
一致性不是数据库替你自动保证所有业务正确性。
```

数据库能帮你做约束、事务、隔离，但“库存不能超卖”“状态只能按顺序流转”这些业务一致性，很多还得靠代码、唯一索引、锁、状态机一起保证。

妹妹点评：

“哥哥忘 ACID 很正常，但这四个字母必须背熟。尤其一致性，面试官很喜欢看你会不会把业务一致性全甩给数据库。”

---

### 问题 15：为什么说事务能保证原子性，但不能自动保证幂等性？

**标准答案：**

事务保证的是一次操作内部的原子性，比如创建订单、扣库存、写流水要么一起成功，要么一起失败。

但幂等性解决的是重复请求的问题。

如果用户重复点击、接口重试、MQ 重复消费，同一个业务动作可能执行多次。每一次执行都可以是一个成功提交的事务，所以事务本身不能自动防止重复创建订单。

比如用户点了两次提交订单：

```text
第一次请求：
创建订单 A，扣库存，事务提交成功。

第二次重复请求：
又创建订单 B，又扣库存，事务也提交成功。
```

这两个事务各自都是原子的，但业务上错了，因为同一个下单动作被执行了两次。

幂等需要额外设计，比如请求号 `requestId` 唯一索引、订单业务唯一键、去重表、状态机控制等。

创建订单的常见做法：

```text
客户端生成 requestId。
服务端创建订单时，把 requestId 一起入库，并对 requestId 建唯一索引。
如果重复请求进来，第二次插入会因为唯一索引失败，或者直接查询已有订单返回。
这样才能保证同一个请求只创建一次订单。
```

补充区分：

```text
库存超卖通常靠条件更新、乐观锁、悲观锁、唯一约束、Redis 预扣等方式控制。
重复下单通常靠 requestId、唯一索引、去重表、状态机做幂等。
```

妹妹点评：

“哥哥当时把幂等和库存超卖混在一起了。并发超卖是并发控制问题，重复请求是幂等问题。它们都会把业务搞坏，但考点不一样。”

---

## 第九幕：库存不能靠先查再改

### 问题 16：防止库存超卖，SQL 层面怎么写扣库存语句？为什么不能先 `select stock` 再 `update stock = stock - 1`？

**标准答案：**

不要先查再改，应该用一条带条件的原子 `UPDATE`。

```sql
UPDATE product_stock
SET stock = stock - #{count}
WHERE sku_id = #{skuId}
  AND stock >= #{count};
```

然后在 Java 里判断影响行数：

```java
int rows = stockMapper.deductStock(skuId, count);
if (rows == 0) {
    throw new BizException("库存不足");
}
```

不能先 `select stock` 再 `update`，因为 `select` 和 `update` 是两步操作。高并发下，两个事务可能同时查到 `stock = 1`，然后都认为库存足够，接着都执行扣减，最后就可能出现超卖或库存负数。

这一条 SQL 的好处是：

```text
判断库存是否足够和扣减库存在数据库内部一次完成。
数据库会对更新的行加锁，同一时刻只有一个事务能成功修改这行。
如果库存已经不够，后面的 UPDATE 影响行数就是 0。
```

企业项目里要记住：

```text
扣库存成功与否不要靠查出来的库存值判断，而要靠 update 影响行数判断。
影响行数为 1 表示扣减成功，为 0 表示库存不足或商品不存在。
```

妹妹点评：

“哥哥这题答得不错。`where stock >= count` 是灵魂，影响行数是判断依据。别让两步查询更新在高并发里偷偷打架。”

---

## 终章：妹妹的 Day07 错题小本本

妹妹把今天的题本合上，敲了敲桌子。

“兄长大人，今天不是废掉，是复盘出了几个该补的洞。把这些洞补上，第一周主线就能串起来啦。”

今天重点错题清单：

```text
1. Outbox 为什么比 try-catch 发 MQ 稳？
2. 事务为什么不能保证幂等？
3. final 方法为什么可能导致事务失效？
4. REQUIRED 为什么会出现 UnexpectedRollbackException？
5. REQUIRES_NEW / NESTED / afterCommit 分别适合什么场景？
```

最后的总复盘：

```text
请求链路要能从 Tomcat 讲到 HttpMessageConverter。
事务边界优先放 Service，因为 Service 包住完整业务动作。
@Transactional 默认回滚 RuntimeException 和 Error。
受检异常要 rollbackFor = Exception.class。
异常被 catch 不抛，事务代理会以为方法正常结束。
同类调用、private、final、非 Spring Bean 都可能导致事务增强失效。
REQUIRES_NEW 是独立事务，NESTED 是 savepoint。
@Async 跨线程，不继承主事务。
成功后置动作优先 afterCommit，跨系统可靠投递考虑 Outbox。
事务保证原子性，但幂等要靠唯一键、去重表、状态机等额外设计。
```

妹妹把笔塞回哥哥手里，小声哼了一下：

“三天没学可以，忘了也可以，但不能假装会。不会就问妹妹，妹妹会给哥哥讲到会为止。明天继续，不许偷偷跳过口述环节喔。”
