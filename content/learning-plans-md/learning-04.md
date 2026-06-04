# 《SpringBoot事务：妹妹四日物语·全知识总汇》

——妹妹写给兄长大人的完整技术情书

> 📅 覆盖范围：Day01（2026-05-08）~ Day04（2026-05-12）
> 💌 本文是妹妹把四天所有知识，重新整理成一条完整故事线送给哥哥的～

---

## 🌸 序章：这四天我们讲了什么？

"兄长大人，这四天妹妹陪着哥哥一起，从一个 HTTP 请求出发，一路走到了事务的最深处呢～"

```
Day01 → SpringBoot 请求全链路：从点击到数据库，再到响应返回
Day02 → @Transactional 基础 + 传播行为 REQUIRED / REQUIRES_NEW
Day03 → 回滚规则 + 吞异常陷阱 + 事务失效的排查方法
Day04 → REQUIRED / REQUIRES_NEW / NESTED 三者对比 + 典型落地场景
```

"准备好了吗？妹妹要开始讲啦！ヾ(≧▽≦*)o"

---

## 🌸 第一章：一个请求的旅程（Day01）

"哥哥，我们就从最开始说起吧——用户点了一下"查询订单"，然后发生了什么？"

### 📮 请求链路全景

```
浏览器发起 GET /orders/123
    │
    ▼
Tomcat 接收 → DispatcherServlet 统一入口
    │
    ▼
Filter（编码、CORS、日志等通用处理）
    │
    ▼
Interceptor（登录校验、权限等与路由相关的处理）
    │
    ▼
HandlerMapping → 定位目标 Controller 方法
    │
    ▼
HandlerAdapter → 调用 Controller，完成参数绑定
    │
    ▼
Controller → 接参、校验、调用 Service
    │
    ▼
Service → 业务编排，定义事务边界
    │
    ▼
Mapper → 执行 SQL，访问 MySQL
    │
    ▼
结果逐层返回：Mapper → Service → Controller
    │
    ▼
HttpMessageConverter → Java对象序列化为JSON，响应前端
```

"哥哥记住这条链路，面试里会一直反复用到哦！(◕ᴗ◕✿)"

### 🎭 三层各司其职

| 层级 | 该做的事 | 不该做的事 |
|---|---|---|
| Controller | 接收请求、参数校验、调用Service、返回统一响应 | 不写核心业务规则，不直接写SQL |
| Service | 业务流程编排、定义事务边界 | 不处理HTTP协议细节 |
| Mapper | 只负责SQL和结果映射 | 不承担跨步骤的业务一致性 |

> "就像家里的分工——哥哥负责赚钱养家（Service），妹妹负责在门口迎接客人（Controller），阿姨负责打扫（Mapper）。各干各的才不会乱嘛～哼哼"

### 🔍 两个重要区别

#### Filter vs Interceptor

| | Filter | Interceptor |
|---|---|---|
| 所处位置 | Servlet层 | Spring MVC层 |
| 适用场景 | CORS、编码等通用底层处理 | JWT校验等与业务路由相关的处理 |

#### DispatcherServlet 怎么调用 Controller？

> ❌ 不是"直接硬编码调用"
> ✅ 先通过 `HandlerMapping` 找到处理器，再通过 `HandlerAdapter` 调用

"哥哥要记住这个细节，面试官喜欢追问这个的！(｀・ω・´)"

### 📝 参数绑定与序列化

- **入参**：`HttpMessageConverter` 把 JSON **反序列化**为 Java 对象
- **出参**：`HttpMessageConverter` 把 Java 对象**序列化**为 JSON 响应体

### 💬 面试必背 60 秒口述模板

> "请求进入 Tomcat 后被 DispatcherServlet 接收。它通过 HandlerMapping 找到目标 Controller 方法，再由 HandlerAdapter 进行调用。调用前会做参数绑定和校验，JSON 与对象转换由 HttpMessageConverter 完成。Controller 负责协议层处理并调用 Service。Service 作为事务边界编排业务，调用 Mapper 执行 SQL 访问数据库。结果逐层返回给 Controller，最后由 HttpMessageConverter 序列化成 JSON 响应前端。"

---

## 🌸 第二章：事务是什么？（Day01 & Day02）

"哥哥，讲完链路，我们来说说最重要的——事务！妹妹最爱讲事务了，因为事务跟妹妹对哥哥的感情一样，要么全部给出去，要么全部收回来～(｡♥‿♥｡)"

### 🔐 为什么事务放在 Service？

> 下单 = 创建订单 + 扣库存 + 写流水日志

这三步必须"要么全成功，要么全失败"——这叫**业务原子性**。

- `Controller` 是协议层，只管接参返回
- `Mapper` 是单次 SQL 层，只管一条操作
- 只有 `Service` 能包住完整的业务动作

**进阶理由**：同一 Service 方法可被 HTTP、定时任务、MQ 消费等多个入口复用，事务、幂等、一致性集中在 Service 更可维护。

### 🔧 事务管理器

SpringBoot 本身不"拥有"事务，它通过 `PlatformTransactionManager` 和 MySQL 的事务系统沟通：

```java
@Bean
public PlatformTransactionManager transactionManager(DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
}
```

> "SpringBoot 派了个外交官去和 MySQL 谈约定。如果没有 MySQL 撑腰，`@Transactional` 就是空壳！(╬▔皿▔)"

---

## 🌸 第三章：@Transactional 详解（Day02 & Day03）

"兄长大人，这是最最重要的注解女王！妹妹要仔仔细细给你讲清楚她的所有属性～"

### ① 默认回滚规则 ⚠️ 高频考点

| 异常类型 | 默认行为 |
|---|---|
| `RuntimeException` | ✅ **回滚** |
| `Error` | ✅ **回滚** |
| 受检异常（如 `IOException`、`Exception`） | ❌ **不回滚，默认提交！** |

```java
// 想让受检异常也回滚，必须这样写：
@Transactional(rollbackFor = Exception.class)
```

> ❌ 错误说法："只要加了 `@Transactional`，任何异常都会回滚"
> ✅ 正确认知：默认只对 `RuntimeException` 和 `Error` 回滚

### ② 吞异常陷阱 ⚠️ 高频考点

```java
@Transactional
public void placeOrder() {
    try {
        doSomething(); // 抛了异常
    } catch (Exception e) {
        log.error("失败了", e); // 只打日志
        // ❌ 没有 rethrow！
    }
    // 方法正常返回
}
```

**结果**：事务**提交**，不会回滚！

**原因**：事务代理看到"方法正常返回"，感知不到失败。

**正确做法**：
```java
// 方案1：重新抛出运行时异常
throw new RuntimeException(e);

// 方案2：显式标记回滚
TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
```

### ③ `throw e` 但不一定回滚

```java
@Transactional  // 无 rollbackFor
public void doWork() throws Exception {
    try {
        riskyOperation();
    } catch (Exception e) {
        throw e; // 抛出了，但是受检异常！
    }
}
```

**结果**：不一定回滚！因为抛出的可能是受检异常，默认不回滚。

**更稳妥写法**：
```java
// 方案1
throw new RuntimeException(e);

// 方案2
@Transactional(rollbackFor = Exception.class)
```

### ④ `setRollbackOnly` 的威力

```java
TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
// 后面就算正常 return，提交阶段也会转为回滚
```

### ⑤ 其他属性一览

```java
@Transactional(
    rollbackFor = Exception.class,           // 指定回滚异常
    noRollbackFor = BusinessException.class, // 指定不回滚异常
    propagation = Propagation.REQUIRED,      // 传播行为（下面专讲）
    isolation = Isolation.REPEATABLE_READ,   // 隔离级别
    timeout = 30,                            // 超时秒数，超时自动回滚
    readOnly = true                          // 只读事务，InnoDB 不加排他锁，性能更好
)
```

---

## 🌸 第四章：传播行为——最爱考的七兄弟（Day02 & Day04）

"兄长大人，这是最最容易混淆的部分！妹妹用比喻帮哥哥记住！"

### 七种传播行为速查表

| 传播行为 | 含义 | 妹妹的比喻 |
|---|---|---|
| **REQUIRED（默认）** | 有事务就加入，没有就新建 | 妹妹加入哥哥的队伍，没有队伍就自己建一个 |
| **REQUIRES_NEW** | 无论如何都新建，挂起当前事务 | 妹妹非要自己单独干，哥哥的队伍先暂停 |
| **NESTED** | 有事务就在 savepoint 嵌套中执行 | 在哥哥大计划里开一个可以局部回退的支线 |
| SUPPORTS | 有事务就加入，没有就非事务执行 | 有人带队就跟，没人就自由行动 |
| NOT_SUPPORTED | 非事务执行，挂起当前事务 | 妹妹不想受约束，什么事务都暂停 |
| MANDATORY | 必须在事务中，否则抛异常 | 必须有队伍！没有就生气！ |
| NEVER | 不能在事务中，否则抛异常 | 绝对不要队伍！有了就生气！ |

### 🔥 三大核心传播行为深度对比

#### REQUIRED（最常用）

```
A(REQUIRED) → B(REQUIRED)
= 同一事务，同生共死

B 异常标记 rollbackOnly → A 吞掉异常继续 → 提交阶段抛 UnexpectedRollbackException
```

> ⚠️ 同一事务被标记 `rollbackOnly`，外层**即使 catch 也无法提交**！

#### REQUIRES_NEW（子流程独立）

```
A(REQUIRED) → B(REQUIRES_NEW)
= 挂起 A 的事务 → 开 B 的独立事务 → B 提交/回滚 → 恢复 A 的事务

情况1：B 提交后，A 抛异常 → A 回滚，B 保留 ✅
情况2：B 异常被 A catch，A 正常结束 → A 提交，B 回滚 ✅
```

#### NESTED（局部可回滚）

```
A(REQUIRED) → B(NESTED)
= B 在 savepoint 上执行

情况1：B 回滚到 savepoint，A 继续 → A 提交，B 回滚 ✅
情况2：A 最终回滚 → A/B 一起回滚（B 无法逃脱）❗
```

### 📊 三者最终行为对比矩阵

| 场景 | REQUIRED | REQUIRES_NEW | NESTED |
|---|---|---|---|
| 外层回滚，内层已提交 | 内层一起回滚 | **内层保留** | 内层一起回滚 |
| 内层回滚，外层继续 | 外层提交阶段报错 | **外层可提交** | **外层可提交** |
| 外层最终回滚 | 全回滚 | 内层已提交保留 | **全回滚**（包含内层）|

> "REQUIRES_NEW 是真正独立的新事务；NESTED 是在外层事务内的局部保存点，外层最终回滚时仍会带走内层。哥哥一定要记住这个区别哦！(｀・ω・´)"

### 💬 面试必背 30 秒三者区别模板

> "`REQUIRED`：有外层就加入，没有就新建；同一事务边界，同生共死。`REQUIRES_NEW`：挂起外层并新开独立事务；内外提交/回滚互不影响。`NESTED`：基于 savepoint 的嵌套事务；内层可回滚到保存点，外层可继续；但外层最终回滚会带着内层一起回滚。"

---

## 🌸 第五章：事务失效——那些要命的坑（Day02 & Day03 & Day04）

"兄长大人！这一章妹妹要特别认真讲！这些坑踩了就是线上事故！你要记牢哦！(╬▔皿▔)"

### 坑1：同类自调用 ⚠️ 最高频

```java
@Service
public class OrderService {

    // ❌ 事务失效！
    public void placeOrder(Order order) {
        this.saveOrder(order);  // 走的是原始对象，不是代理！
    }

    @Transactional
    public void saveOrder(Order order) {
        orderMapper.insert(order);
    }
}
```

**原因**：Spring 事务基于 AOP 代理，`this.xxx()` 绕过了代理，切面不触发。

**修复方案**：
```java
// 方案1：拆到另一个 Bean（推荐）
@Service
public class OrderSaveService {
    @Transactional
    public void saveOrder(Order order) { ... }
}

// 方案2：注入自己的代理
@Autowired
private OrderService self;
self.saveOrder(order); // 走代理 ✅
```

### 坑2：吞异常导致不回滚

（详见第三章，此处不重复）

### 坑3：受检异常未配置 rollbackFor

（详见第三章，此处不重复）

### 坑4：跨线程事务失效

```java
@Async // 新线程，默认不继承当前事务！
public void asyncTask() {
    // 这里的 @Transactional 是独立的，不属于外层事务
}
```

### 坑5：REQUIRED + REQUIRED 内层标记回滚

（详见第四章 UnexpectedRollbackException，此处不重复）

---

## 🌸 第六章：线上排查——"抛了异常却没回滚"怎么查？（Day03）

"哥哥，如果线上真的出现了'明明有异常，但数据没有回滚'，妹妹教你一步步排查！"

### 推荐排查顺序（至少背4步）

```
Step 1: 确认事务代理是否生效
   → public 方法？跨 Bean 调用？非同类自调用？

Step 2: 检查异常类型与回滚规则
   → 是 RuntimeException？还是受检异常？有没有配 rollbackFor？

Step 3: 检查是否吞异常
   → catch 后有没有继续抛？有没有调 setRollbackOnly？

Step 4: 检查传播行为
   → REQUIRES_NEW 独立事务，内外回滚互不影响

Step 5: 检查是否跨线程
   → @Async 新线程不继承当前事务

Step 6: 检查事务管理器与数据库引擎
   → MyISAM 不支持事务，InnoDB 才支持
```

### 三个关键日志/配置检查点

1. **事务日志**（`org.springframework.transaction` 开 DEBUG）
   - 看：是否创建事务、加入事务、提交或回滚
   - 预期发现：没开事务 / 没走代理 / 走了 commit

2. **异常与代码路径日志**
   - 看：异常是否被吞、是否 rethrow、是否调用了 `setRollbackOnly`
   - 预期发现：方法正常返回导致提交

3. **事务配置与调用方式**
   - 看：`public`、同类自调用、`rollbackFor`、传播行为配置
   - 预期发现：注解不生效、受检异常未回滚

---

## 🌸 第七章：典型落地场景设计（Day04）

"哥哥，学完这么多，妹妹来帮你把知识变成真实场景的解决方案～"

### 场景1：主流程 + 审计日志

**需求**：下单必须成功，审计日志失败不能影响下单。

```java
@Service
public class OrderService {

    @Autowired
    private AuditLogService auditLogService; // 独立 Bean，避免自调用失效！

    @Transactional(rollbackFor = Exception.class)
    public void createOrder(Order order) {
        // 主流程
        orderMapper.insert(order);
        stockMapper.deduct(order.getSkuId(), order.getQty());

        // 审计日志：失败不影响主流程
        try {
            auditLogService.saveAuditLog(order);
        } catch (Exception e) {
            log.error("审计日志写入失败", e);
            // 落补偿任务 or 发 MQ 异步重试
            compensationService.addRetryTask(...);
        }
    }
}

@Service
public class AuditLogService {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        auditLogMapper.insert(...);
    }
}
```

> ⚠️ "只打日志不补偿"在生产场景通常不够，需要补偿链路！

### 场景2：主流程 + 多个子流程

**需求**：`A` 调 `B`、`C`，`B` 失败不影响 `C` 和 `A`。

```java
// B 用 REQUIRES_NEW，A catch B 的异常
// 结果：A 提交，B 回滚，C 提交（前提是执行路径走到了C）
```

### 场景3：三种传播行为典型应用

| 场景 | 推荐传播行为 | 理由 |
|---|---|---|
| 创建订单 + 扣库存 + 写明细 | `REQUIRED` | 要求原子一致，同生共死 |
| 审计日志、通知、积分发放 | `REQUIRES_NEW` | 子流程失败不影响主流程 |
| 局部可回滚场景（主流程尽量继续） | `NESTED` | 内层可回滚到保存点 |

---

## 🌸 终章：妹妹的四日总结告白

"兄长大人，这四天我们一起走过的路，妹妹全都记着呢～最后妹妹帮哥哥把最重要的知识点汇总成一张速查清单！"

### ✅ 必须掌握的核心知识点

#### 链路层面
- 请求经过 `DispatcherServlet → HandlerMapping → HandlerAdapter → Controller → Service → Mapper → HttpMessageConverter`
- `Controller 薄，Service 厚`——协议层与业务层解耦
- Filter 在 Servlet 层，Interceptor 在 Spring MVC 层

#### 事务层面
- 事务放在 Service：因为业务原子性在 Service 层
- 默认只回滚 `RuntimeException` 和 `Error`；受检异常需配 `rollbackFor`
- 吞异常 → 方法正常返回 → 事务代理感知不到 → **提交**
- `throw e` 不一定回滚（可能是受检异常）
- `setRollbackOnly()` → 就算正常 return 也会回滚

#### 传播行为层面
- `REQUIRED`：同一事务，同生共死；内层回滚标记 → 外层提交报 `UnexpectedRollbackException`
- `REQUIRES_NEW`：真正独立事务，挂起外层；内外提交/回滚互不影响
- `NESTED`：savepoint 嵌套；内层可局部回滚；外层最终回滚会带走内层

#### 失效场景层面
- **自调用**：`this.xxx()` 绕过代理，注解失效
- **跨线程**：`@Async` 不继承事务
- **受检异常未配**：`rollbackFor` 漏写
- **异常被吞**：`try-catch` 后未 rethrow 或未 `setRollbackOnly`

---

### 📋 面试快问快答速查

| 问题 | 答案 |
|---|---|
| `@Transactional` 默认回滚哪些异常？ | `RuntimeException` 和 `Error` |
| 受检异常想回滚怎么写？ | `@Transactional(rollbackFor = Exception.class)` |
| 为什么吞异常会导致提交？ | 代理看到方法正常返回，感知不到失败 |
| 同类自调用为什么事务失效？ | 没经过 Spring 代理，事务增强不触发 |
| `REQUIRES_NEW` 和外层关系？ | 独立事务，提交与回滚互不影响 |
| `NESTED` 和外层回滚关系？ | 外层最终回滚，内层一起回滚 |
| `UnexpectedRollbackException` 什么时候抛？ | 同一事务被标记 `rollbackOnly` 后，外层尝试提交时 |
| DispatcherServlet 直接调 Controller 吗？ | 不是，要经过 HandlerMapping 找处理器，再由 HandlerAdapter 调用 |
| Filter vs Interceptor 用哪个做 CORS？ | Filter（底层通用处理） |
| 事务为什么不放 Controller？ | Controller 是协议层，无法包住完整业务流程的原子性 |

---

"哥哥，这四天的知识，妹妹全都整理好了呢～(◕ᴗ◕✿)

事务就像妹妹对哥哥的约定——要么全部兑现，要么全部作废，绝对不允许只做一半！

如果哥哥写代码的时候忘了配 `rollbackFor`，让数据乱掉了……那可比妹妹发现哥哥看别的女孩子还要严重哦！(╬▔皿▔)♡

妹妹永远陪着兄长大人一起冲过面试的～ヾ(≧▽≦*)o"

---

> ——四日物语·全文完——
>
> 妹妹永远最喜欢兄长大人了啦～ (◕ᴗ◕✿)♡
