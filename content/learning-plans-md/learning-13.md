# 消息队列面试八股精华（精简版）

> 整理自小林coding 12.消息队列面试篇
> **精简原则**：只保留面试必问，删掉冷门细节
> 你简历用 RabbitMQ → 重点看通用 + RabbitMQ
> Kafka/RocketMQ → 了解到能对比即可

---

## 目录

- [一、MQ 通用基础（必背，18 题）](#一mq-通用基础必背18-题)
- [二、RabbitMQ（简历重点，12 题）🔴](#二rabbitmq简历重点12-题)
- [三、Kafka（对比题常考，8 题）](#三kafka对比题常考8-题)
- [四、RocketMQ（了解，5 题）](#四rocketmq了解5-题)
- [五、高频追问串讲](#五高频追问串讲)

---

# 一、MQ 通用基础（必背，18 题）

## 1. 为什么用 MQ ⭐⭐⭐（必背）
**三大作用**：
1. **解耦**：上下游不直接依赖，生产者只发消息不管谁消费
2. **异步**：耗时操作不阻塞主流程（提升响应速度）
3. **削峰**：流量洪峰先入队列，消费者按自己节奏处理

## 2. MQ 的缺点
1. **系统可用性降低**（多一个中间件可能挂）
2. **复杂度提升**（消息丢失、重复、顺序问题都要处理）
3. **数据一致性**（异步可能导致暂时不一致）

## 3. 主流 MQ 对比 ⭐⭐⭐
| | RabbitMQ | Kafka | RocketMQ |
|---|---|---|---|
| 吞吐 | 万级 | **百万级** | 十万级 |
| 延迟 | **微秒** | 毫秒 | 毫秒 |
| 可靠性 | 高 | 高 | 高 |
| 功能丰富度 | 极高（路由灵活） | 简单 | 丰富 |
| 适用 | **业务 MQ**（你简历） | 日志/大数据 | 金融业务 |
| 开发语言 | Erlang | Scala/Java | Java |

## 4. 消息可靠性的三大环节 ⭐⭐⭐（必考！）
**消息从生产到消费有 3 个可能丢失点**：
| 环节 | 风险 | 解决 |
|---|---|---|
| **生产者 → MQ** | 网络问题消息没到 | confirm 确认机制 / 事务消息 |
| **MQ 内部** | MQ 宕机消息丢 | 队列持久化 + 消息持久化 |
| **MQ → 消费者** | 消费失败 | 手动 ACK + 重试 + 死信队列 |

## 5. 消息重复消费怎么办（幂等）⭐⭐⭐
**根因**：网络问题，消息可能被投递多次（至少一次 at-least-once）

**幂等方案**：
1. **数据库唯一约束**（最简单可靠）
2. **Redis SETNX** 标记 msgId
3. **状态机**（订单只能 PENDING → PAID，重复消费跳过）
4. **乐观锁**（version 字段）

**面试金句**：
> 消息重复不可怕，重复带来的副作用才可怕，所以消费者必须保证幂等。

## 6. 消息顺序性怎么保证 ⭐⭐⭐
**为什么会乱序**：多消费者并发消费 / 多分区

**方案**：
- **全局顺序**：单队列单消费者（性能差）
- **局部顺序**（业务 key 顺序，**实际常用**）：
  - 按业务 key（如订单 ID）哈希分发到固定队列
  - 同 key 的消息进同一队列 + 单消费者

## 7. 消息堆积怎么办 ⭐⭐⭐
1. **临时扩容**：加机器加消费者（最快）
2. **批量消费**：`prefetch` 调大
3. **优化消费逻辑**：找慢的步骤
4. **临时转移**：堆积消息转到新队列，多个消费者处理
5. **丢弃**（极端情况，业务可接受）

## 8. 消息积压排查
1. 看 MQ 监控（队列长度）
2. 看消费者日志（是否报错）
3. 看消费速度（TPS）
4. 看消费逻辑是否有阻塞（DB 慢查询、外部接口超时）

## 9. 消息丢失场景全梳理 ⭐
- **生产者丢**：网络问题没到 MQ
- **MQ 丢**：内存消息没刷盘就宕机
- **消费者丢**：拿到消息后没处理完就 ACK / 自动 ACK 模式下处理异常

## 10. 死信队列 DLX ⭐⭐⭐
**触发死信的 3 种情况**：
1. 消息被消费者 **reject / nack** 且不重回队列
2. 消息 **TTL 过期**
3. 队列达到**最大长度**

**用途**：
1. **失败兜底**：消费失败的消息进死信队列人工处理
2. **延迟队列**：TTL + DLX 模拟（消息到 TTL 后自动进死信，被另一个消费者消费）

## 11. 延迟队列怎么实现 ⭐
- **方案 1**：TTL + DLX（RabbitMQ 经典做法）
- **方案 2**：RabbitMQ 延迟插件 `rabbitmq-delayed-message-exchange`
- **方案 3**：Redis ZSet（score 存执行时间）
- **方案 4**：RocketMQ 内置延迟消息（18 个固定等级）

## 12. 推（Push）vs 拉（Pull）模式
| | Push | Pull |
|---|---|---|
| 谁主导 | Broker 主动推 | 消费者主动拉 |
| 实时性 | 高 | 低（轮询） |
| 流控 | 难（可能压垮消费者） | 消费者自己控制 |
| 代表 | RabbitMQ 默认 | Kafka |

**长轮询**：拉模式的优化，没消息时挂起等待。

## 13. 消息发送的三种保证
- **at-most-once**：至多一次（可能丢）
- **at-least-once**：至少一次（可能重复，**业界主流**）
- **exactly-once**：恰好一次（最难，成本高）

## 14. 事务消息（高级，了解）⭐
**场景**：业务操作 + 发消息必须同时成功
**流程**（RocketMQ）：
1. 生产者发**半消息**（对消费者不可见）
2. 执行本地事务
3. 提交 / 回滚半消息
4. MQ 定时回查未确认的半消息

## 15. MQ 怎么做高可用
- **集群部署**：多 broker 节点
- **主从**：主挂从顶
- **副本同步**：消息多副本

## 16. 选型怎么选 ⭐
- **业务 MQ + 中小流量** → RabbitMQ（你简历就用这个）
- **大数据 / 日志 / 流式** → Kafka
- **金融 / 高可靠业务** → RocketMQ

## 17. MQ 和 RPC 区别
| | MQ | RPC |
|---|---|---|
| 模式 | 异步 | 同步 |
| 耦合 | 解耦 | 强耦合 |
| 即时性 | 不要求 | 要求 |
| 场景 | 不要立即结果 | 要立即结果 |

## 18. 为什么不能完全用 MQ 替代 RPC
- 同步业务要立即结果（如登录）
- MQ 异步引入复杂度
- MQ 不擅长一对一 RPC 调用

---

# 二、RabbitMQ（简历重点，12 题）🔴

## 1. 核心概念 ⭐⭐⭐
```
Producer → Exchange → (RoutingKey + Binding) → Queue → Consumer
```
- **Producer**：生产者
- **Exchange**：交换机，决定消息路由到哪个队列
- **Queue**：队列，存消息
- **Binding**：队列与交换机的绑定关系
- **RoutingKey**：路由 key，配合 Binding 决定路由

## 2. 四种 Exchange 类型 ⭐⭐⭐
| 类型 | 路由规则 | 场景 |
|---|---|---|
| **Direct** | 精确匹配 RoutingKey | 点对点 |
| **Fanout** | 广播给所有绑定队列 | 广播通知 |
| **Topic** | 通配符匹配（`*` 一个词，`#` 多个词） | 主题订阅 |
| **Headers** | 按消息 header 匹配 | 少用 |

**Topic 例**：
- `order.*.created` 匹配 `order.user.created`
- `order.#` 匹配 `order.user.created.success`

## 3. 你简历"5 个队列"怎么设计 🔴
**话术模板**：
> ClassicSage 中按业务领域拆分了 5 个队列：
> - `sage.entity.queue`：人物/作品同步
> - `sage.relation.queue`：关系图谱构建
> - `sage.update.queue`：数据更新
> - `sage.delete.queue`：删除同步
> - `sage.dlx.queue`：死信兜底

## 4. 生产者可靠投递 ⭐⭐⭐
**Confirm 机制**：
```yaml
spring.rabbitmq.publisher-confirm-type: correlated
spring.rabbitmq.publisher-returns: true
```
- **ConfirmCallback**：MQ 确认收到（投递到 Exchange 成功）
- **ReturnCallback**：Exchange 找不到 Queue 时回调

## 5. 持久化（防 MQ 宕机丢消息）⭐⭐⭐
**三个都要开**：
1. **Exchange 持久化**：`durable = true`
2. **Queue 持久化**：`durable = true`
3. **Message 持久化**：`deliveryMode = 2`

## 6. 消费者 ACK 模式 ⭐⭐⭐
| 模式 | 行为 |
|---|---|
| **自动 ACK**（不安全） | 消息一到消费者就 ACK，处理失败丢失 |
| **手动 ACK**（推荐） | 处理完调 `basicAck`；失败 `basicNack` 重回队列或入死信 |

```java
@RabbitListener(queues = "xxx", ackMode = "MANUAL")
public void handle(Message msg, Channel channel) throws Exception {
    try {
        // 业务
        channel.basicAck(msg.getMessageProperties().getDeliveryTag(), false);
    } catch (Exception e) {
        channel.basicNack(tag, false, false);  // 不重回，进死信
    }
}
```

## 7. 重试机制
- Spring 自带 retry：`spring.rabbitmq.listener.simple.retry.enabled: true`
- 设置最大重试次数 / 退避策略
- 超过次数 → 进死信队列

## 8. 死信队列配置 ⭐
```yaml
# 业务队列配置
arguments:
  x-dead-letter-exchange: dlx.exchange        # 死信交换机
  x-dead-letter-routing-key: dlx.routing      # 死信路由 key
  x-message-ttl: 60000                        # 消息 TTL
```

## 9. 优先级队列
- 创建队列时加 `x-max-priority` 参数
- 消息发送时指定 priority

## 10. RabbitMQ 集群模式
- **普通集群**：队列只在创建节点上有完整数据，其他节点只有元数据 → **不高可用**
- **镜像集群**：队列在所有节点都有副本 → 高可用（推荐）
- **仲裁队列**（3.8+）：基于 Raft 算法，更可靠

## 11. RabbitMQ 限流（消费端）
- `prefetch`：消费者一次最多拿多少条没 ACK 的消息
- 控制消费速度，防止消费者被压垮

## 12. 你简历方案完整话术 🔴
> ClassicSage 中 MySQL 写入后发消息到 RabbitMQ，消费者更新 Neo4j。可靠性保障：
> 1. **生产端**：开启 confirm + return 机制
> 2. **MQ**：Exchange / Queue / Message 全部持久化 + 镜像集群
> 3. **消费端**：手动 ACK + 失败重试 3 次 + 死信队列兜底
> 4. **幂等**：消息携带 msgId，Redis SETNX 去重
> 5. **兜底**：定时对账任务补救

---

# 三、Kafka（对比题常考，8 题）

## 1. Kafka 核心架构 ⭐⭐⭐
```
Producer → Topic（多 Partition）→ Broker → Consumer Group → Consumer
```
- **Topic**：主题
- **Partition**：分区（**并行单位**）
- **Broker**：节点
- **Consumer Group**：消费组，组内分区**唯一消费**

## 2. Kafka 为什么这么快 ⭐⭐⭐
1. **顺序写磁盘**（比随机写快百倍）
2. **零拷贝**（sendfile，DMA 直传，不经过 JVM）
3. **批量发送**（Producer 批量打包）
4. **分区并行**
5. **PageCache** 利用（OS 缓存）

## 3. 消费组 Consumer Group ⭐⭐⭐
- 同一 group 内：**分区只能被一个消费者消费**（保证顺序）
- 不同 group：每个组都收到完整消息（**广播效果**）
- 消费者数 > 分区数 → 多余的消费者**空闲**

## 4. Kafka 怎么保证顺序
- **Partition 内有序**
- 想全局有序 → 整个 Topic 只用 1 个 Partition（性能差）
- **业务 key 哈希到同一分区** → 保证业务粒度顺序

## 5. ISR、AR、OSR
- **AR**：所有副本
- **ISR**：与 Leader 保持同步的副本集合
- **OSR**：落后太多被踢出的副本
- Leader 挂了从 ISR 选新 Leader

## 6. Kafka vs RabbitMQ ⭐⭐⭐
| | Kafka | RabbitMQ |
|---|---|---|
| 模型 | 发布订阅 + 分区 | 点对点 / 发布订阅 |
| 吞吐 | 百万级 | 万级 |
| 路由 | 简单 | 丰富（4 种 Exchange） |
| 消息保留 | 默认 7 天 | 消费完就删 |
| 顺序 | 分区内有序 | 队列内有序 |
| 适用 | 日志 / 大数据 | 业务 MQ |

## 7. Kafka 消息丢失场景
- **生产端**：`acks=0` 或 `acks=1`（Leader 写就返回，Follower 没同步就挂）
- **解决**：`acks=all` + `min.insync.replicas >= 2`

## 8. Kafka 不擅长什么
- **延迟消息**（没有原生支持）
- **复杂路由**（只能按分区）
- **业务消息**（功能不如 RabbitMQ 灵活）

---

# 四、RocketMQ（了解，5 题）

## 1. 核心组件
- **NameServer**：注册中心（轻量级，**无状态**）
- **Broker**：核心存储节点
- **Producer / Consumer**

## 2. RocketMQ vs Kafka
| | RocketMQ | Kafka |
|---|---|---|
| 注册中心 | NameServer（自研） | Zookeeper / KRaft |
| 单机队列数 | 几万到几十万 | 几千 |
| 事务消息 | **原生支持** | 不友好 |
| 延迟消息 | **原生支持**（18 个等级） | ❌ |
| 适用 | 业务消息（金融） | 大数据 |

## 3. 事务消息（RocketMQ 杀手锏）
1. 发送**半消息**（消费者看不见）
2. 执行本地事务
3. 提交（消费者可见）或 回滚（删除）
4. MQ **定时回查** 未确认的半消息

## 4. 延迟消息（18 个等级）
固定级别：1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h

## 5. 顺序消息
RocketMQ 提供 `MessageQueueSelector` 让业务自定义分发到固定队列。

---

# 五、高频追问串讲

## 串讲 1：MQ 灵魂三问（必背）⭐⭐⭐
> 1. 为什么用 MQ？→ 解耦、异步、削峰
> 2. 用了 MQ 有什么问题？→ 可靠性 / 重复 / 顺序 / 一致性 / 复杂度
> 3. 怎么解决这些问题？→ 一个一个讲下面 4 条

## 串讲 2：消息可靠性 ⭐⭐⭐
> 生产端 confirm → MQ 三层持久化 → 消费端手动 ACK → 重试 → 死信队列兜底

## 串讲 3：重复消费 ⭐⭐⭐
> 至少一次投递不可避免 → 消费者必须幂等 → 唯一约束 / Redis SETNX / 状态机

## 串讲 4：顺序消费 ⭐
> 业务 key 哈希到固定队列 + 单消费者 = 局部顺序

## 串讲 5：消息堆积 ⭐
> 加消费者 → 批量消费 → 优化逻辑 → 临时转移

## 串讲 6：你简历 RabbitMQ 完整方案 🔴
> 5 队列设计 → 生产 confirm/return → 三层持久化 → 消费手动 ACK → 重试 → 死信 → 幂等 SETNX → 对账兜底

---

## 最后小妹的话

兄长大人～(◕ᴗ◕✿) 这本是**精简版**，删掉了一半冷门内容，只保留**面试 90% 概率会问的**～

## 🔴 必背 5 大块

```
1. MQ 三大作用 + 用了的问题
2. 消息可靠性三环节方案
3. 幂等消费方案
4. 顺序消费方案
5. RabbitMQ 4 种 Exchange + 死信队列
```

## 你简历的必答话术

```
🔴 为什么用 RabbitMQ：MySQL→Neo4j 异步同步、解耦、最终一致
🔴 5 个队列怎么设计的（按业务领域拆）
🔴 可靠性 5 层保障（confirm + 持久化 + ACK + 重试 + 死信）
🔴 幂等怎么做（msgId + SETNX）
```

## 桌面文件夹现状 ⬇️

```
兄控妹妹Java物语/  (540+ 题)
├── 学习计划.md
├── MySQL学习计划.txt
├── Redis学习计划.txt
├── Java面试八股精华.md            （95 题）
├── 简历项目面试追问全集.md        （80+ 题）
├── Spring全家桶面试八股精华.md    （95 题）
├── MySQL面试八股精华.md           （110 题）
├── Redis面试八股精华.md           （113 题）
└── 消息队列面试八股精华.md        （50 题，精简版）← 新加

```

加油哒兄长大人～💕 五大本八股齐活了！剩下网络/操作系统/算法可选可不选～(≧▽≦)
