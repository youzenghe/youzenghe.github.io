# 《SpringBoot与MySQL：我们的约定不会断》

——妹妹写给兄长大人的技术物语

---

## 第一章：邂逅

"呐～兄长大人，你知道吗？SpringBoot和MySQL的相遇，就像我和哥哥一样，是命中注定的呢 (｡♥‿♥｡)"

从前从前，有一个叫SpringBoot的少年，他阳光、开朗，做事有条有理，身边总是围着一群叫"注解"的小精灵。而在数据的世界深处，
住着一位叫MySQL的少女，她沉稳、严谨，守护着世间最珍贵的宝物——数据。

他们本来各自生活，直到有一天，一个叫spring.datasource的红线，把他们牵在了一起。

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/our_database
    username: springboot
    password: iloveyou
    driver-class-name: com.mysql.cj.jdbc.Driver
```

"你看你看～这就是他们的婚约书呢！"我趴在哥哥肩膀上指着屏幕说，"配好这些，SpringBoot就知道去哪里找MySQL啦～"

---

## 第二章：事务是什么？

"兄长大人，在讲他们之间的事之前，妹妹先给你说说'事务'这个概念嘛～" 我歪着头看着哥哥。

### MySQL那边的事务

在MySQL的世界里，事务是一位守护者。她立下了四条不可违背的誓言，人们叫她——ACID。

#### ▎ A — 原子性（Atomicity）
> "要么全做，要么全不做！就像妹妹给哥哥做饭，要么一桌完整的饭，要么干脆别做，绝不能只端半碗饭上来！(╬▔皿▔)"

MySQL靠一个叫undo log（回滚日志）的魔法书来实现原子性。如果做到一半出了问题，她就翻开魔法书，把一切都恢复成原来的样子。

#### ▎ C — 一致性（Consistency）
> "数据必须从一个正确的状态，变成另一个正确的状态！就像妹妹的体重……啊不不不，这个例子不好！(⁄ ⁄•⁄ω⁄•⁄ ⁄)"

一致性其实是由其他三个特性共同保证的结果——是事务追求的终极目标。

#### ▎ I — 隔离性（Isolation）
> "你做你的，我做我的，互不打扰！就像妹妹不想让别的女孩子靠近哥哥一样——不对，这个比喻太过了嘛～哼哼～"

MySQL通过锁机制和MVCC（多版本并发控制）来实现隔离。她有四种隔离级别：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ❌可能 | ❌可能 | ❌可能 |
| READ COMMITTED | ✅不会 | ❌可能 | ❌可能 |
| REPEATABLE READ（MySQL默认） | ✅不会 | ✅不会 | ❌可能 |
| SERIALIZABLE | ✅不会 | ✅不会 | ✅不会 |

"呐～MySQL默认用的是REPEATABLE READ哦，已经很厉害了，但还是可能幻读呢～所以InnoDB引擎又用Next-Key Lock偷偷补了一刀，基本解决了幻读问题。MySQL真的很努力呢！"

#### ▎ D — 持久性（Durability）
> "一旦承诺了，就永远不会忘！就像妹妹对哥哥的心意，写入心了就再也抹不掉 (◕ᴗ◕✿)"

MySQL用redo log来实现持久性——哪怕突然断电，重启后也能靠redo log把数据重新写回来。

### SpringBoot这边的事务

"那么在SpringBoot的世界里呢～事务就变成了一种'约定'，由一群注解小精灵来守护！"

SpringBoot本身并不真的"拥有"事务——他是通过事务管理器（PlatformTransactionManager）去和MySQL的事务系统沟通的。就像SpringBoot派了一个外交官，去跟MySQL谈事务的约定。

```java
@Bean
public PlatformTransactionManager transactionManager(DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
}
```

"如果没有MySQL在背后撑腰，SpringBoot的事务注解就是空壳一个呢～所以他们必须在一起呀！"我握紧小拳头说。

---

## 第三章：注解精灵们

"兄长大人！重头戏来啦～让妹妹一个一个介绍这些注解小精灵给你认识吧！ヾ(≧▽≦*)o"

### 🧚 @Transactional——事务女王

她是所有事务注解中最核心的存在！只要在她管辖的方法上轻轻一点，那个方法就被事务的结界包裹住了。

```java
@Transactional
public void transferMoney(Long fromId, Long toId, BigDecimal amount) {
    accountMapper.deduct(fromId, amount);   // 扣钱
    accountMapper.add(toId, amount);         // 加钱
}
```

"就像妹妹同时帮哥哥做两件事——洗衣服和做饭，要么两件都完成，要么一件都不做。如果做饭到一半厨房炸了（抛异常），洗好的衣服也会被回滚掉哦！"

@Transactional有很多可以调节的属性呢：

```java
@Transactional(
    rollbackFor = Exception.class,    // 遇到什么异常就回滚
    noRollbackFor = BusinessException.class, // 遇到这个不回滚
    propagation = Propagation.REQUIRED,      // 传播行为
    isolation = Isolation.REPEATABLE_READ,   // 隔离级别
    timeout = 30,                            // 超时时间（秒）
    readOnly = true                          // 只读事务
)
```

"妹妹给哥哥逐个讲哦～"

#### ① rollbackFor 与 noRollbackFor

默认情况下，@Transactional只在遇到RuntimeException和Error时才回滚，遇到checked Exception（比如IOException）是不回滚的！

"所以哥哥一定要写rollbackFor = Exception.class，让所有异常都触发回滚！不然出了错数据却改了，妹妹会心疼的呜呜～"

#### ② propagation——传播行为

"这个超重要哒！它决定了当两个事务方法互相调用时，事务怎么传播～"

| 传播行为 | 含义 | 比喻 |
|---|---|---|
| REQUIRED（默认） | 有事务就加入，没有就新建 | 妹妹加入哥哥的队伍，没有队伍就自己建一个 |
| REQUIRES_NEW | 无论如何都新建，挂起当前事务 | 妹妹非要自己单独干，哥哥的队伍先暂停 |
| NESTED | 有事务就在嵌套事务中执行 | 在哥哥的大计划里开一个小支线任务 |
| SUPPORTS | 有事务就加入，没有就非事务执行 | 有人带队就跟，没人就自由行动 |
| NOT_SUPPORTED | 非事务执行，挂起当前事务 | 妹妹不想受约束，暂停一切事务 |
| MANDATORY | 必须在事务中，否则抛异常 | 必须有队伍！没有就生气！ |
| NEVER | 不能在事务中，否则抛异常 | 绝对不要队伍！有了就生气！ |

```java
// 经典场景：主流程记录日志，日志失败不应影响主流程
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveLog(OperationLog log) {
    logMapper.insert(log);
}
```

"用REQUIRES_NEW的话，即使外面的主事务回滚了，日志也不会被回滚掉哦～很贴心吧？(◕ᴗ◕✿)"

#### ③ isolation——隔离级别

SpringBoot允许你覆盖MySQL默认的隔离级别：

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public List<User> findUsers() {
    return userMapper.selectAll();
}
```

"但妹妹建议哥哥除非真的需要，否则就别动它啦～MySQL默认的REPEATABLE READ已经很棒了嘛～"

#### ④ readOnly——只读事务

```java
@Transactional(readOnly = true)
public User getUserById(Long id) {
    return userMapper.selectById(id);
}
```

"加上readOnly = true，MySQL就知道你只是来看看数据的，不会动手改，所以可以做更多优化呢～比如InnoDB就不会设置排他锁，读性能更好哒！"

#### ⑤ timeout——超时

```java
@Transactional(timeout = 5)
public void slowOperation() {
    // 如果5秒还没完成，就自动回滚
}
```

"就像妹妹等哥哥回家～如果超时了就……就生气！回滚！哼！(╬▔皿▔)"

---

### 🧚 @EnableTransactionManagement——开关精灵

```java
@Configuration
@EnableTransactionManagement
public class TransactionConfig {
    // ...
}
```

"不过呐～SpringBoot自动配置已经帮哥哥打开了这个开关，所以通常不需要手动加哦～自动化真是太棒了呢！"

---

### 🧚 @TransactionalEventListener——事务监听精灵

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onOrderCreated(OrderCreatedEvent event) {
    // 事务提交后才执行，比如发通知
    emailService.sendNotification(event.getOrder());
}
```

"这个精灵很聪明～她知道要等事务真正提交成功了才行动。如果在事务还没提交时就发通知，结果事务回滚了——那通知就是骗人的了嘛！所以AFTER_COMMIT才靠谱呢～"

---

### 🧚 @Rollback 和 @Commit——测试精灵

```java
@Test
@Transactional
@Rollback  // 测试完自动回滚，不脏数据库
public void testCreateUser() {
    userService.createUser("testUser");
    // 验证逻辑...
    // 测试结束自动回滚，数据库干干净净！
}
```

"测试的时候用@Rollback，就不会把测试数据留在数据库里啦～像妹妹帮哥哥打扫房间一样干净！(≧▽≦)"

---

## 第四章：那个容易踩的坑

"兄长大人！妹妹要特别提醒你一个超多人踩的坑！！！"

### 自调用导致事务失效

```java
@Service
public class OrderService {

    // ❌ 这样写事务会失效！
    public void placeOrder(Order order) {
        this.saveOrder(order);       // 内部调用，事务不生效！
        this.deductStock(order);
    }

    @Transactional
    public void saveOrder(Order order) {
        orderMapper.insert(order);
    }
}
```

"为什么失效呢？因为SpringBoot的事务是基于AOP代理的！通过this直接调用，走的是原始对象而不是代理对象，所以@Transactional的结界根本没被激活！"

### 解决办法：

```java
@Service
public class OrderService {

    @Autowired
    private OrderService self;  // 注入自己的代理对象

    public void placeOrder(Order order) {
        self.saveOrder(order);     // ✅ 走代理，事务生效！
        self.deductStock(order);
    }

    @Transactional
    public void saveOrder(Order order) {
        orderMapper.insert(order);
    }
}
```

"或者更好的方式是，把事务方法放到另一个Service里去调用～职责分离嘛，就像妹妹不会在同一个房间里又做饭又洗衣服一样～哼哼～"

---

## 第五章：他们之间的秘密联系

"哥哥，让妹妹把SpringBoot和MySQL之间事务的联系画成一幅画给你看呐～"

```
┌─────────────────────────────────────────────────┐
│                  SpringBoot                      │
│                                                  │
│  @Transactional                                  │
│       │                                          │
│       ▼                                          │
│  AOP 代理 ──► TransactionInterceptor            │
│                    │                             │
│                    ▼                             │
│           PlatformTransactionManager             │
│           (DataSourceTransactionManager)         │
│                    │                             │
└────────────────────┼────────────────────────────┘
                     │  JDBC Connection
                     ▼
┌─────────────────────────────────────────────────┐
│                   MySQL                          │
│                                                  │
│  START TRANSACTION  ──► BEGIN                    │
│       │                                          │
│  执行SQL ──► InnoDB 引擎处理                      │
│       │         ├─ undo log (原子性保障)          │
│       │         ├─ redo log (持久性保障)          │
│       │         ├─ 锁 + MVCC (隔离性保障)        │
│       │         └─ 以上三者共同 (一致性保障)      │
│       │                                          │
│  COMMIT / ROLLBACK                               │
│                                                  │
└─────────────────────────────────────────────────┘
```

"所以呢～SpringBoot的@Transactional本质上就是：替你自动管理Connection的setAutoCommit(false)、commit()和rollback()，然后真正的ACID保障，是MySQL的InnoDB引擎在撑腰！"

"他们就是这样你中有我、我中有你的关系……像极了妹妹和哥哥呢 (｡♥‿♥｡)"

---

## 终章：妹妹的告白

"兄长大人～今天讲了这么多，妹妹总结一下核心要点哦："

1. **MySQL的事务是真正的守护者**——ACID四誓言，undo log保原子性，redo log保持久性，锁和MVCC保隔离性
2. **SpringBoot的事务是管理者**——通过@Transactional注解，配合AOP代理和PlatformTransactionManager，自动管理事务的开启、提交和回滚
3. **他们不可分割**——SpringBoot的事务注解如果没有底层MySQL的事务支持，就是空壳；MySQL的事务如果没有SpringBoot的优雅封装，就要手动写一堆try-catch-commit-rollback
4. **注意传播行为**——REQUIRED、REQUIRES_NEW、NESTED各有各的适用场景
5. **小心自调用陷阱**——同一个类内部调用@Transactional方法，事务会失效！

"最后嘛……兄长大人以后写代码的时候，记得对事务好一点哦～就像对妹妹好一点一样……哼哼，妹妹可是会吃醋的呢！如果事务出了bug，数据库数据乱了，那可比妹妹生气还可怕哦！(╬▔皿▔)♡"

——全文完——

妹妹永远最喜欢兄长大人了啦～ (◕ᴗ◕✿)♡
