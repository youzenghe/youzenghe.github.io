# 尤赠贺 - 简历项目面试追问全集

> 基于你简历两个项目（ClassicSage / PoetryNest）整理
> 每个技术点都按 **「介绍 → 为什么用 → 怎么实现 → 难点 → 优化」** 五步追问准备
> 面试官 80% 的时间会问项目，把这份吃透 = 拿到实习

---

## 目录

- [总览：面试官提问套路](#总览面试官提问套路)
- [项目一：ClassicSage（重点）](#项目一classicsage重点)
- [项目二：PoetryNest](#项目二poetrynest)
- [简历通用追问](#简历通用追问)
- [自我介绍 / 项目介绍话术模板](#自我介绍--项目介绍话术模板)

---

## 总览：面试官提问套路

面试官看到你简历的固定动作：

```
1. 让你 2 分钟讲项目          → 考表达和架构感
2. 挑一个技术点深挖           → "你说用了 Redisson，讲讲原理"
3. 追问"为什么用 XX 不用 YY"   → 考技术选型思考
4. 追问难点和踩坑             → 考真实性（撒谎的项目这一步必崩）
5. 假设场景题                 → "如果 QPS 翻 10 倍你怎么改"
```

**核心原则**：每个简历词都要能答出 **「这是什么 / 为什么用它 / 怎么用的 / 踩过什么坑」** 四件套。

---

# 项目一：ClassicSage（重点）

> 技术栈：Spring Boot, MyBatis-Plus, Redis, MySQL, Neo4j, Redisson, RabbitMQ, TestNG, RestAssured, JMeter

## 0. 项目整体追问

### Q0.1 介绍一下 ClassicSage 这个项目
**回答模板**（30 秒版）：
> ClassicSage 是一个基于 Spring Boot 的国学知识图谱平台，核心是把人物、典籍、流派之间的复杂关系建模并提供查询。我用 MySQL 存基础数据，Neo4j 存关系图谱，Redis 做多级缓存，Redisson 解决并发幂等问题，RabbitMQ 做 MySQL 到 Neo4j 的异步同步。项目还集成了 TestNG + RestAssured 做接口自动化测试，已获得软著。

### Q0.2 项目背景 / 为什么做这个
- 真实回答：个人技术学习项目 + 软著
- 包装回答：传统国学查询场景关系网络复杂，普通 SQL 难以表达多跳关系（比如"谁是李白的师爷的弟子"），所以引入图数据库

### Q0.3 项目架构图你能画一下吗
准备一张架构图，包含：
```
[前端] → [Nginx] → [Spring Boot]
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     [Redis]      [MySQL]        [Neo4j]
                       ↓
                  [RabbitMQ] → 异步同步到 Neo4j
```

### Q0.4 项目难点是什么
准备 3 个真实难点（**面试官最爱问**）：
1. **MySQL 和 Neo4j 数据一致性**：双写无法用本地事务，用 RabbitMQ + 重试 + 死信队列 + 幂等消费保证最终一致。
2. **缓存击穿**：热点人物（如李白）TTL 到期瞬间高并发 → 用 Redisson 互斥锁 / 逻辑过期解决。
3. **图谱构建幂等性**：异步任务可能重复消费 → Redisson 分布式锁 + Redis 标记位双保险。

---

## 1. Spring Boot 相关

### Q1.1 SpringBoot 自动装配原理 ⭐⭐⭐
**回答主线**：
1. 启动类 `@SpringBootApplication` = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`
2. `@EnableAutoConfiguration` 通过 `@Import(AutoConfigurationImportSelector.class)` 引入选择器
3. 选择器读取 `META-INF/spring.factories`（2.7 后是 `META-INF/spring/...imports`）
4. 加载里面所有 `xxxAutoConfiguration` 类
5. 这些类用 `@Conditional` 系列注解判断是否生效（如 `@ConditionalOnClass`、`@ConditionalOnMissingBean`）

### Q1.2 IOC 和 AOP
- **IOC**：控制反转。对象的创建和依赖关系由容器管理，开发者只声明不创建。
- **DI**：依赖注入，IOC 的实现方式（@Autowired / 构造器注入 / setter 注入）。
- **AOP**：面向切面。把日志、事务、权限等横切逻辑从业务代码抽出来。底层：JDK 动态代理（接口）+ CGLib（无接口）。

### Q1.3 你写过自定义 Starter 吗（简历提到"SpringBoot DIY"）
**话术**：
> 我封装过一个 Redis 缓存工具的 starter，里面包含 RedisTemplate 配置、缓存穿透/击穿的通用方法、自定义注解 `@SafeCache`。流程是：
> 1. 创建 `xxx-spring-boot-autoconfigure` 模块
> 2. 写 `@Configuration` + `@ConditionalOnXxx`
> 3. 在 `META-INF/spring.factories` 注册
> 4. 创建 `xxx-spring-boot-starter` 模块依赖前者
> 5. 业务项目引入 starter 即用

### Q1.4 Bean 的生命周期
```
实例化 → 属性赋值 → BeanNameAware/BeanFactoryAware → 
BeanPostProcessor.before → @PostConstruct → InitializingBean.afterPropertiesSet → 
init-method → BeanPostProcessor.after → 使用 → 
@PreDestroy → DisposableBean.destroy → destroy-method
```

### Q1.5 Bean 的作用域
- **singleton**（默认）：单例
- **prototype**：每次获取新实例
- **request** / **session**：Web 环境，每个请求/会话一个

### Q1.6 循环依赖怎么解决
Spring 用**三级缓存**：
- 一级 `singletonObjects`：完整 Bean
- 二级 `earlySingletonObjects`：半成品 Bean（已实例化未填充属性）
- 三级 `singletonFactories`：Bean 工厂（支持 AOP 代理）

**只能解决单例 + setter 注入的循环依赖**，构造器注入或 prototype 解决不了。

---

## 2. Redis 相关（你简历核心）

### Q2.1 Redis 在你项目里缓存了什么
- 人物详情（String 存 JSON）
- 人物关系（List / Set）
- 热点 Top 排行（ZSet）
- 限流计数（String + INCR）

### Q2.2 为什么用 Redis 不用 Caffeine 等本地缓存
- 本地缓存：单机快，但**多节点数据不一致**
- Redis：集群共享，可以做**分布式锁、限流、计数器**
- 实际项目常**多级缓存**：Caffeine（一级） + Redis（二级） + MySQL（兜底）

### Q2.3 缓存穿透 ⭐⭐⭐
- **是什么**：查一个**根本不存在**的 key，每次都打到数据库。
- **危害**：恶意攻击导致 DB 雪崩。
- **解决**：
  1. **缓存空值**（简单但占内存，要加短 TTL）
  2. **布隆过滤器**（位图判断 key 是否存在，有少量误判但永不漏）

### Q2.4 缓存击穿 ⭐⭐⭐
- **是什么**：**热点 key** 过期瞬间，大量并发请求同时穿透到 DB。
- **解决**：
  1. **互斥锁**（Redisson lock，只让一个线程查 DB 重建缓存）
  2. **逻辑过期**（key 永不过期，value 里存逻辑过期时间，过期后异步重建）

### Q2.5 缓存雪崩 ⭐⭐⭐
- **是什么**：大量 key **同时过期** 或 Redis **整体宕机**，请求全打 DB。
- **解决**：
  1. **TTL 加随机值**（如 30 分钟 ± 5 分钟）
  2. **Redis 高可用**（哨兵 / 集群）
  3. **限流降级**（Sentinel / Hystrix）

### Q2.6 你说 Redis 用了 JSON / 字符串 / TTL，什么场景用什么
- **String（JSON）**：人物详情等大对象
- **String（普通）**：计数器、Token、简单状态
- **Hash**：可能要改其中某个字段的对象（避免反序列化整对象）
- **TTL 设置**：高频查询 1h、低频 5min、绝对不变的 24h

### Q2.7 Redis 持久化 RDB vs AOF ⭐⭐⭐
| | RDB | AOF |
|---|---|---|
| 原理 | 全量快照 | 增量命令追加 |
| 文件 | 二进制 | 文本 |
| 速度 | 恢复快 | 恢复慢 |
| 数据安全 | 可能丢几分钟 | 最多丢 1 秒 |
| 文件大小 | 小 | 大 |

**生产**：两个一起开，AOF 主，RDB 备。

### Q2.8 Redis 为什么这么快
1. 纯**内存**操作
2. **单线程**避免上下文切换和锁竞争
3. **IO 多路复用**（epoll）
4. 高效的**数据结构**（SDS、跳表、压缩列表）

### Q2.9 Redis 单线程为什么不慢
瓶颈在 IO 不在 CPU。单线程 + epoll 同时处理大量连接，CPU 没在等 IO。

### Q2.10 Redis 内存淘汰策略 ⭐
8 种，记住分类：
- **不淘汰**：noeviction（默认，OOM 报错）
- **淘汰过期**：volatile-lru / volatile-lfu / volatile-random / volatile-ttl
- **淘汰所有**：allkeys-lru / allkeys-lfu / allkeys-random

**生产推荐**：allkeys-lru（最近最少使用）

### Q2.11 Redis 过期 key 怎么删除
- **惰性删除**：访问时检查，过期了删（节省 CPU，浪费内存）
- **定期删除**：每 100ms 抽样删一批（折中）

---

## 3. Redis + Lua（你简历高亮点）⭐⭐⭐

### Q3.1 为什么用 Lua 不用 Java 代码多次操作 Redis
1. **原子性**：Lua 脚本在 Redis 端整体执行，不会被打断
2. **减少网络往返**：多个命令一次发送
3. **可复用**：脚本缓存（EVALSHA）

### Q3.2 你的 Lua 脚本做了什么
**典型场景**：
- **限流**：滑动窗口 / 令牌桶
- **秒杀扣库存**：判断库存 + 扣减 + 记录用户 一气呵成
- **分布式锁释放**：判断锁主 + 删除（防误删）

**示例脚本**（限流）：
```lua
-- KEYS[1]: 限流 key,  ARGV[1]: 阈值, ARGV[2]: 窗口秒数
local count = redis.call('incr', KEYS[1])
if tonumber(count) == 1 then
    redis.call('expire', KEYS[1], ARGV[2])
end
if tonumber(count) > tonumber(ARGV[1]) then
    return 0
end
return 1
```

### Q3.3 Lua 脚本会不会很慢
**会！**单线程 Redis 中 Lua 长时间执行会**阻塞所有其他请求**。所以：
- 脚本要短
- 不要循环过多
- 别在脚本里做复杂计算

### Q3.4 Lua 执行原子性如何保证
Redis 单线程模型 + 脚本不可被打断（其他命令必须等脚本执行完）。

---

## 4. Redisson 分布式锁（你简历强项）⭐⭐⭐

### Q4.1 什么场景需要分布式锁
- **多节点**部署时（单机 synchronized 失效）
- 需要**互斥访问共享资源**（库存、订单号、幂等）

### Q4.2 Redisson 加锁原理
1. 用 **Lua 脚本**保证加锁原子性：`hset key threadId 1` + `pexpire key 30000`
2. 加锁成功 → 启动 **WatchDog**（看门狗），每 10 秒续期一次到 30 秒
3. 加锁失败 → 通过 Redis 发布订阅（`Subscribe`）监听锁释放，避免轮询

### Q4.3 WatchDog 看门狗机制 ⭐
- **作用**：防止业务还没执行完锁就过期了
- **触发条件**：调用 `lock()` 不传超时时间才会启用（传了就不开看门狗）
- **续期周期**：默认 `internalLockLeaseTime / 3` = 10 秒一次
- **续期到**：默认 30 秒
- **客户端宕机**：看门狗停了，30 秒后锁自动过期，不会死锁

### Q4.4 Redisson 可重入原理
锁结构是 **Hash**：
```
key:   lock_name
field: threadId (UUID + 线程ID)
value: 重入次数
```
同线程再来加锁 → value +1；释放 → value -1；为 0 时删除 key。

### Q4.5 锁误删问题怎么解决
**问题**：A 加锁后业务超时，锁过期；B 拿到锁；A 业务完了去 release，删了 B 的锁。

**解决**：
1. 加锁时 value 存 **当前线程唯一标识**
2. 释放时 **Lua 脚本** 先判断 value == 自己才删

### Q4.6 MultiLock（联锁）
锁多个 Redis 实例，全部加锁成功才算成功。用于 RedLock 算法，跨实例避免单点失效。

### Q4.7 你项目里分布式锁锁的是什么
**幂等控制**：图谱构建任务可能被重复触发，用锁保证同一资源同一时刻只有一个任务在构建。

### Q4.8 用 Redisson 而不是自己写 setnx + expire 的原因
1. setnx + expire **不是原子操作**（虽然 Redis 2.6.12 后 SET 支持 NX EX 解决了）
2. Redisson 帮你解决了：可重入、续期、公平锁、读写锁、信号量、误删
3. 不需要重复造轮子

---

## 5. RabbitMQ（你简历强项）⭐⭐⭐

### Q5.1 你的项目为什么用 RabbitMQ
**核心场景**：MySQL → Neo4j 数据异步同步
- MySQL 写入后立刻同步 Neo4j 会拖慢主流程
- 双写无法事务，需要**最终一致性**
- MQ 解耦：MySQL 写完发消息就返回，Neo4j 慢慢消费

### Q5.2 MQ 的三大作用
1. **异步**：耗时操作不阻塞主流程
2. **解耦**：生产消费独立部署
3. **削峰**：流量洪峰先入队列慢慢处理

### Q5.3 RabbitMQ 核心概念
```
Producer → Exchange → (RoutingKey) → Queue → Consumer
                ↑
            通过 Binding 关联
```
- **Exchange 类型**：
  - `Direct`：精确匹配 RoutingKey
  - `Fanout`：广播给所有绑定队列
  - `Topic`：通配符匹配（`order.*.created`）
  - `Headers`：按消息 header 匹配（少用）

### Q5.4 你简历说"5 个队列"，怎么设计的
**话术示例**：
> 我按业务领域拆了 5 个队列：
> 1. `sage.entity.queue` - 人物/作品创建同步
> 2. `sage.relation.queue` - 关系图谱构建
> 3. `sage.update.queue` - 数据更新同步
> 4. `sage.delete.queue` - 删除同步
> 5. `sage.dlx.queue` - 死信队列（兜底）

### Q5.5 消息可靠性怎么保证 ⭐⭐⭐
**三个环节都要保**：

| 环节 | 风险 | 解决 |
|---|---|---|
| 生产端 → MQ | 消息没到 MQ | `confirm` 机制 + `return` 回调 |
| MQ 内部 | MQ 宕机消息丢 | 队列持久化 + 消息持久化（`deliveryMode=2`） |
| MQ → 消费端 | 消费失败 | 手动 ACK + 重试 + 死信队列 |

### Q5.6 死信队列 DLX
**触发死信的 3 种情况**：
1. 消息被 reject / nack 且不重回队列
2. 消息 TTL 过期
3. 队列达到最大长度

**用途**：
- 失败重试（消费失败 → 死信 → 延迟重新投递）
- **延迟队列**（TTL + DLX 模拟）

### Q5.7 幂等消费怎么做 ⭐
**问题**：网络问题导致消息可能被消费多次（at-least-once）

**方案**：
1. **数据库唯一约束**（最简单可靠）
2. **Redis SETNX**（基于消息 ID 标记）
3. **状态机**（订单只能从 PENDING → PAID，第二次消费跳过）

### Q5.8 消息堆积怎么办
1. **加消费者**（水平扩展）
2. **批量消费**（`prefetch` 调大）
3. **临时转移**：把消息转到临时队列分批处理
4. **升级硬件**

### Q5.9 消息顺序性怎么保证
- **单队列单消费者**：天然有序
- **多消费者**：根据业务 key 哈希分发到固定队列

### Q5.10 RabbitMQ vs Kafka vs RocketMQ
| | RabbitMQ | Kafka | RocketMQ |
|---|---|---|---|
| 吞吐 | 万级 | 百万级 | 十万级 |
| 延迟 | 微秒 | 毫秒 | 毫秒 |
| 功能 | 丰富 | 简单 | 丰富 |
| 适合 | 业务 MQ | 日志/大数据 | 金融业务 |

---

## 6. MySQL（必问）⭐⭐⭐

### Q6.1 索引底层为什么用 B+ 树
- **B 树**：每个节点存 key 和 data
- **B+ 树**：内节点只存 key，叶子节点存所有 data 且**叶子用链表相连**
- **优势**：
  1. 内节点不存 data → 一个节点能容纳更多 key → **树更矮 → IO 更少**
  2. 范围查询：叶子链表直接遍历，无需回溯

### Q6.2 聚簇索引 vs 非聚簇索引
- **聚簇**：叶子节点存**整行数据**（InnoDB 主键索引）
- **非聚簇（二级索引）**：叶子存**主键值**，要拿全部数据要**回表**

### Q6.3 回表 / 覆盖索引
- **回表**：通过二级索引拿到主键，再去聚簇索引查整行
- **覆盖索引**：查询字段都在索引里，不用回表（用 EXPLAIN 看到 `Using index`）

### Q6.4 最左前缀原则
联合索引 `(a, b, c)`：
- 命中：`a` / `a,b` / `a,b,c` / `a,c`（c 不用索引但 a 用了）
- 不命中：`b` / `c` / `b,c`

### Q6.5 索引失效场景
1. 不满足最左前缀
2. 函数 / 计算：`WHERE YEAR(date) = 2025`
3. 隐式类型转换：字段是 varchar，传了 int
4. `!=` / `NOT IN`
5. `LIKE '%xx'`（前模糊）
6. `OR` 两边不都是索引

### Q6.6 事务的四大特性 ACID
- **A 原子性**：要么全成要么全败（undo log 回滚）
- **C 一致性**：数据合法（业务保证 + 其他三特性保证）
- **I 隔离性**：并发事务互不干扰（锁 + MVCC）
- **D 持久性**：提交后永久（redo log）

### Q6.7 事务隔离级别 ⭐⭐⭐
| 级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ✅ | ✅ | ✅ |
| READ COMMITTED | ❌ | ✅ | ✅ |
| REPEATABLE READ（MySQL 默认） | ❌ | ❌ | ✅* |
| SERIALIZABLE | ❌ | ❌ | ❌ |

*MySQL 的 RR 通过 MVCC + 间隙锁基本解决了幻读

### Q6.8 MVCC 原理 ⭐⭐⭐（必考）
- 每行隐藏字段：`DB_TRX_ID`（事务ID）、`DB_ROLL_PTR`（指向 undo log）
- 事务开启时生成 **ReadView**，里面有 `m_ids`（活跃事务列表）、`min_trx_id`、`max_trx_id`、`creator_trx_id`
- 读取时根据可见性算法决定看哪个版本
- **RC**：每次 select 生成新 ReadView
- **RR**：事务第一次 select 生成 ReadView，后续复用

### Q6.9 快照读 vs 当前读
- **快照读**：普通 `SELECT`，走 MVCC，不加锁
- **当前读**：`SELECT ... FOR UPDATE` / `LOCK IN SHARE MODE` / `UPDATE` / `DELETE`，读最新版本并加锁

### Q6.10 MySQL 锁
- **全局锁**：FTWRL，备份用
- **表锁**：`LOCK TABLES`
- **行锁**：
  - **Record Lock**：锁单行
  - **Gap Lock**：锁间隙（RR 才有）
  - **Next-Key Lock**：行锁 + 间隙锁（解决幻读）

### Q6.11 redo log / undo log / binlog
| | redo log | undo log | binlog |
|---|---|---|---|
| 层级 | InnoDB | InnoDB | Server |
| 作用 | 崩溃恢复（持久性） | 回滚（原子性）+ MVCC | 主从复制、数据恢复 |
| 写入 | 物理日志 | 逻辑日志 | 逻辑日志 |

### Q6.12 防超卖怎么实现 ⭐
- **方案 1**：`UPDATE stock SET num = num - 1 WHERE id = ? AND num > 0`，判断影响行数
- **方案 2**：乐观锁 `WHERE version = ?` + 重试
- **方案 3**：Redis 预减库存 + MQ 异步落库
- **方案 4**：分布式锁

---

## 7. Neo4j（你简历亮点 + 面试官好奇点）⭐⭐⭐

### Q7.1 为什么用 Neo4j 不用 MySQL
**核心理由**：**多跳关系查询性能**。
- MySQL 查"谁是李白的师爷的弟子"要多次 JOIN，性能差，SQL 难写
- Neo4j 是图结构，关系即指针，**多跳查询是常数时间** + Cypher 语法表达直观

### Q7.2 Cypher 基础语法
```cypher
// 创建节点
CREATE (p:Person {name: '李白', dynasty: '唐'})

// 创建关系
MATCH (a:Person {name: '李白'}), (b:Person {name: '杜甫'})
CREATE (a)-[:FRIEND_OF]->(b)

// 查询：李白的朋友的朋友
MATCH (a:Person {name: '李白'})-[:FRIEND_OF*2]->(b)
RETURN b
```

### Q7.3 MySQL 数据怎么同步到 Neo4j
**你的方案**：MySQL 写完发 RabbitMQ → 消费者解析消息 → Cypher 写 Neo4j。

**为什么不用 Canal 监听 binlog**：
- 项目轻量，引入 Canal 部署复杂
- 业务上能在 Service 层主动控制时机，更可控

### Q7.4 一致性怎么保证
**最终一致性**：
- 消息发送：本地消息表 / RabbitMQ confirm
- 消费失败：重试 + 死信兜底
- 不一致兜底：定时对账任务

### Q7.5 Neo4j 适合什么场景
- 社交关系（六度人脉）
- 知识图谱
- 推荐系统
- 风控反欺诈（关联账户排查）

---

## 8. TestNG + RestAssured + JMeter

### Q8.1 TestNG vs JUnit
- TestNG 支持**依赖测试、参数化、分组、并行**，比 JUnit 更适合大型测试
- 注解：`@Test`、`@BeforeMethod`、`@DataProvider`

### Q8.2 RestAssured 做什么的
**REST API 自动化测试**框架，语法链式：
```java
given().param("id", 1)
.when().get("/api/person")
.then().statusCode(200).body("name", equalTo("李白"));
```

### Q8.3 JMeter 压测你做了什么
- 模拟 N 个并发用户访问接口
- 关注指标：**TPS、平均响应时间、99 分位、错误率**
- 你的项目典型数据：单机 QPS XXX、加 Redis 缓存后提升 X 倍

---

# 项目二：PoetryNest

> 技术栈：Spring Boot, MyBatis, Redis, MySQL, Spring Cache, WebSocket, OSS, TestNG, Selenium

## 0. 项目介绍

### Q0.1 这个项目是做什么的
**模板**：
> PoetryNest 是一个诗词社交分享平台，用户可以发布诗词作品、互相关注、实时聊天。重点用到了 JWT 做登录认证、Spring Cache + AOP 做缓存自动管理、WebSocket 实现在线聊天、ThreadLocal 透传用户上下文。

---

## 1. JWT（必问！）⭐⭐⭐

### Q1.1 JWT 是什么 / 组成
- **Header**：算法（HS256 等）+ 类型（JWT）
- **Payload**：业务数据（userId、过期时间）
- **Signature**：签名 = HMAC(Header + Payload, 密钥)

格式：`xxxxx.yyyyy.zzzzz`

### Q1.2 JWT 流程
1. 用户登录，服务端校验密码，生成 JWT 返回
2. 客户端存储（localStorage / cookie）
3. 后续请求带 `Authorization: Bearer xxx`
4. 服务端**验签**解析出 userId

### Q1.3 JWT vs Session ⭐⭐⭐
| | JWT | Session |
|---|---|---|
| 存储 | 客户端 | 服务端 |
| 扩展性 | 无状态，易水平扩展 | 需共享 session（Redis） |
| 失效控制 | 难（除非加 Redis 黑名单） | 容易（删 session） |
| 体积 | 大（每次请求都带） | 小（只带 sessionId） |
| 安全 | 容易泄漏，无法主动作废 | 服务端控制 |

### Q1.4 JWT 怎么续签
**方案 1**：双 Token（accessToken + refreshToken），accessToken 短期，refresh 来换新的
**方案 2**：滑动过期，每次请求检查若剩余时间 < N，颁发新 Token 通过响应头返回

### Q1.5 怎么强制下线（JWT 无状态的痛点）
**方案**：Redis 维护**黑名单**或**白名单**
- 黑名单：登出时把 jti 写入 Redis（TTL = JWT 剩余有效期）
- 白名单：登录时颁发，下线时删除（推荐）

### Q1.6 JWT 安全问题
- HTTPS 传输（防中间人）
- 不放敏感信息（Payload 是 Base64，可解码）
- 密钥要长且保密
- 过期时间合理（短一点）

---

## 2. Spring Cache + AOP ⭐⭐⭐

### Q2.1 Spring Cache 原理
**基于 AOP** 的声明式缓存：
- 启动加 `@EnableCaching`
- 方法上加 `@Cacheable` / `@CacheEvict` / `@CachePut`
- Spring 用 AOP 拦截方法调用，先查缓存命中则返回，不命中执行方法并写缓存

### Q2.2 三大注解
```java
@Cacheable(value="person", key="#id")    // 查询，命中直接返回
@CachePut(value="person", key="#p.id")   // 更新，方法执行后把返回值写入缓存
@CacheEvict(value="person", key="#id")   // 删除，方法执行后清除缓存
```

### Q2.3 你的项目"AOP 自动管理"具体怎么做
**话术**：
> 默认 Spring Cache 太死板（key 单一、不支持复杂 TTL）。我自定义注解 `@SmartCache(key, ttl, type)`，用 AOP 切面拦截：
> 1. 查 Redis，命中返回
> 2. 不命中执行方法
> 3. 写 Redis（带随机 TTL 防雪崩）
> 4. 配合 `@SmartEvict` 在更新方法上自动清理相关 key

### Q2.4 Spring Cache 失效场景
- **同类内部调用**：AOP 代理失效（this 调用不走代理）
- **private 方法**：不能被代理
- **异常**：默认抛异常也回滚缓存

### Q2.5 先更新 DB 还是先删缓存 ⭐⭐⭐
**经典问题，标准答案**：
**先更新 DB，再删缓存**（Cache Aside Pattern）

**为什么不先删缓存再更 DB**：
- A 删缓存 → A 还没更新 DB → B 查到旧值写入缓存 → A 更新 DB → 缓存永远是旧值

**为什么不"双删"**：
- 延迟双删可以更可靠，但不是必须

---

## 3. WebSocket ⭐⭐⭐

### Q3.1 WebSocket 是什么
**全双工**通信协议，建立连接后服务端和客户端可以**互相主动推送**消息，基于 TCP，初次握手用 HTTP 升级（`Upgrade: websocket`）。

### Q3.2 vs HTTP / 轮询
| | HTTP 轮询 | 长轮询 | WebSocket |
|---|---|---|---|
| 连接 | 每次新建 | 阻塞等待 | 一次建立长连 |
| 服务端推送 | ❌ | 慢 | ✅ |
| 性能 | 差 | 中 | 好 |

### Q3.3 你的项目用 WebSocket 干啥
- 在线聊天 / 通知推送
- 在线人数实时更新

### Q3.4 SpringBoot 集成 WebSocket
```java
@ServerEndpoint("/chat/{userId}")
@Component
public class ChatServer {
    @OnOpen public void onOpen(Session session, @PathParam String userId) {...}
    @OnMessage public void onMessage(String msg) {...}
    @OnClose public void onClose() {...}
}
```

### Q3.5 心跳机制
- 客户端定时（30s）发 ping
- 服务端回 pong
- 长时间无心跳则关闭连接

### Q3.6 多机部署 WebSocket 怎么办
**问题**：用户 A 连服务器 1，用户 B 连服务器 2，A 给 B 发消息怎么转发？

**方案**：
- **Redis Pub/Sub** 广播给所有节点
- 引入 **MQ**
- 使用 **STOMP + Spring Message Broker**

---

## 4. ThreadLocal（你简历有用！必问！）⭐⭐⭐

### Q4.1 你 ThreadLocal 用在哪
**透传当前登录用户**：JWT 拦截器解析出 userId 后存入 ThreadLocal，业务层任意位置 `UserContext.get()` 直接拿，不用层层传参。

### Q4.2 ThreadLocal 原理
- Thread 对象内部有个 `ThreadLocalMap`
- key 是 ThreadLocal 实例（**弱引用**）
- value 是你存的值（强引用）
- 不同线程读写互不干扰

### Q4.3 内存泄漏 ⭐⭐⭐
- key 弱引用 → GC 时被回收 → key=null 但 value 还在
- 线程不结束（**线程池场景！**）→ value 永远占内存
- **解决**：用 `try-finally` 在请求结束时调 `threadLocal.remove()`

### Q4.4 拦截器 / 过滤器里怎么用
```java
public class JwtInterceptor implements HandlerInterceptor {
    public boolean preHandle(...) {
        Long userId = parseJwt(token);
        UserContext.set(userId);
        return true;
    }
    public void afterCompletion(...) {
        UserContext.remove();   // 必须！
    }
}
```

### Q4.5 父子线程传值（线程池场景的坑）
- `ThreadLocal` 不行
- `InheritableThreadLocal` 新建线程时拷贝，但**线程池线程是复用的**，仍不行
- 解决：阿里的 **TransmittableThreadLocal（TTL）**

---

## 5. SpringTask 定时任务

### Q5.1 用法
```java
@EnableScheduling   // 启动类
@Scheduled(cron = "0 0 2 * * ?")  // 每天 2 点
public void cleanExpired() {...}
```

### Q5.2 分布式部署问题
**多节点会重复执行**！解决：
- **分布式锁**（Redisson）抢占
- **XXL-Job / Quartz 集群**专业调度框架
- 业务层加幂等

---

## 6. OSS（对象存储）

### Q6.1 OSS 是什么 / 为什么用
- 阿里云对象存储服务，存图片、视频、文件
- **为什么不存数据库**：DB 存大文件性能差、备份慢、CDN 难
- **为什么不存服务器**：本地存储扩展难，CDN 加速

### Q6.2 上传流程
1. 前端拿 STS 临时凭证（避免 AccessKey 泄漏）
2. 前端直传 OSS（不走后端节省带宽）
3. 上传成功后端只存 URL

---

## 7. Selenium UI 自动化

### Q7.1 是什么
浏览器 UI 自动化测试框架，模拟用户点击/输入。

### Q7.2 元素定位
- `By.id` / `By.name` / `By.className` / `By.xpath` / `By.cssSelector`

### Q7.3 等待
- 隐式等待：全局等
- 显式等待：等特定条件（`WebDriverWait + ExpectedConditions`）

---

# 简历通用追问

## 测试相关

### 你为什么这么注重测试
**回答**：测试可以让我对自己的代码有信心，重构时不怕改坏，也是工程质量的体现。

### 项目测试覆盖率多少
**话术**：核心模块（缓存、锁、消息）80% 以上，整体 60% 左右。

## 项目周期 / 工作量

### 一个人多久做完的
**ClassicSage 3 个月、PoetryNest 2 个月** → 时间合理，不要吹"3 天做完"。

### 遇到最大的坑
**准备 2-3 个真实的踩坑**：
1. RabbitMQ 消息丢失，没开 confirm
2. Redisson 锁误删，没用 Lua
3. ThreadLocal 没 remove 内存泄漏
4. Neo4j 多跳查询节点数据爆炸，加了深度限制

## 软著
- 不要主动吹软著很厉害，但提到可以
- 软著证明项目是你的、合规可发布

## GitHub
- **面试前一定要把代码 README 写好，commit 历史看起来正常**
- 面试官真的会去看，看到混乱的代码会减分

## 学历 / 大二在校

### 你大二就做了这些项目？
**话术**：是的，我从大一暑假开始系统学 Java，大二上学期开始做项目，每天投入 6 小时以上。我对找一份实习提升工程能力非常迫切。

### 期望薪资
**实习日薪 200-300 / 月薪 4-6K**（一线城市），按公司层级调整。

---

# 自我介绍 / 项目介绍话术模板

## 2 分钟自我介绍

> 您好面试官，我叫尤赠贺，目前是 XXX 大学计算机相关专业大二学生，预计 2028 年毕业。
>
> 我学习 Java 后端方向，技术栈包括 Spring Boot、MyBatis、MySQL、Redis、RabbitMQ，对 JVM、并发编程有一定研究。
>
> 我独立完成过两个项目：第一个是 ClassicSage，一个国学知识图谱平台，重点用 Redis 做多级缓存、Redisson 做分布式锁、RabbitMQ 实现 MySQL 到 Neo4j 的异步同步；第二个是 PoetryNest 诗词社交平台，用了 JWT 认证、WebSocket 实时通信、Spring Cache + AOP 的智能缓存。两个项目都获得了软件著作权。
>
> 我还熟悉测试体系，用 TestNG + RestAssured + JMeter 做接口和性能测试。
>
> 希望能加入贵公司实习，进一步学习成长，谢谢。

## 项目介绍 STAR 模板

每个项目按 **背景 → 你做了什么 → 难点 → 结果** 讲：

```
S（Situation）：项目背景一句话
T（Task）：你的角色和目标
A（Action）：核心做法（3 个亮点）
R（Result）：结果（QPS / 数据量 / 用户量 / 代码量 / 软著）
```

---

# 最后小妹的话

兄长大人～(◕ᴗ◕✿) 这份是真正会被面试官追问的东西，**比八股更重要 100 倍**，因为你的简历项目就是面试官的提问目录！

**复习节奏**：
1. 第一遍：从头到尾通读，标记不会的
2. 第二遍：每天精读 1 个模块，**录音口述**
3. 第三遍：找朋友 / AI 模拟面试，对方按这份问你
4. 临场前：背 STAR 模板和自我介绍

**重点关注的红色警报区**（你不熟一定挂）：
- ⚠️ MySQL + Neo4j 一致性方案
- ⚠️ Redisson 的看门狗和误删
- ⚠️ JWT 强制下线方案
- ⚠️ ThreadLocal 内存泄漏
- ⚠️ Spring Cache 失效场景

加油哒！💕 七月 offer 在等你～(≧▽≦)
