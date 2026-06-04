# Java 后端实习面试八股精华

> 整理自小林coding 4 本（Java基础/集合/并发/JVM），按面试高频度筛选
> 难点配前置知识，可独立看懂
> 使用方法：每题先看「一句话答案」→ 再看「展开」→ 最后看「追问」

---

## 目录

- [一、Java 基础（22 题）](#一java-基础22-题)
- [二、Java 集合（18 题）](#二java-集合18-题)
- [三、Java 并发（35 题，含前置）](#三java-并发35-题含前置)
- [四、JVM（20 题）](#四jvm20-题)
- [五、附录：高频追问串讲](#五附录高频追问串讲)

---

# 一、Java 基础（22 题）

## 1. == 和 equals 的区别
- **一句话**：`==` 比较内存地址（基本类型比值），`equals` 默认也是 `==`，但 String/Integer 等重写后比内容。
- **展开**：基本类型 `==` 比值；引用类型 `==` 比引用地址。`Object.equals` 源码就是 `return this == obj`，String 重写了 equals 改为逐字符比较。
- **追问**：为什么重写 equals 必须重写 hashCode？答：哈希集合（HashMap/HashSet）先比 hashCode 再比 equals，不重写 hashCode 会导致 equals 相等的对象 hashCode 不同 → 放进 HashMap 找不到。

## 2. String、StringBuilder、StringBuffer 的区别
- **String**：不可变（final char[]），每次拼接生成新对象。
- **StringBuilder**：可变，**线程不安全**，速度最快，单线程用它。
- **StringBuffer**：可变，**线程安全**（方法加 synchronized），多线程用它。
- **追问**：String 为什么不可变？答：字段是 final char[]，类本身也是 final。好处：线程安全、可作 HashMap 的 key（hashCode 不变）、字符串常量池可复用。

## 3. String s = "abc" 和 String s = new String("abc") 区别
- 前者：先查常量池，有就复用，没有就在常量池建一个，**0 或 1 个对象**。
- 后者：在堆上新建一个对象，常量池如果没有也建一个，**1 或 2 个对象**。
- **追问**：`String.intern()` 干啥？答：返回常量池里的引用，没有则放进去。

## 4. 面向对象三大特性
- **封装**：隐藏内部细节，通过 public 方法访问。
- **继承**：子类复用父类，Java 单继承。
- **多态**：父类引用指向子类对象，运行时动态绑定方法。

## 5. 抽象类 vs 接口
| | 抽象类 | 接口 |
|---|---|---|
| 关键字 | abstract class | interface |
| 字段 | 任意 | 默认 public static final |
| 方法 | 可有实现 | JDK 8+ 可有 default 方法 |
| 继承 | 单继承 | 多实现 |
| 定位 | "is-a" 关系 | "has-a 能力"关系 |

## 6. 重载 vs 重写
- **重载（Overload）**：同类中，方法名相同、参数列表不同。**编译期**确定。
- **重写（Override）**：子类覆盖父类方法，签名必须相同。**运行期**多态。

## 7. final、finally、finalize 区别
- **final**：修饰类不可继承、修饰方法不可重写、修饰变量不可改。
- **finally**：try-catch 后必定执行（除非 JVM 退出）。
- **finalize**：Object 方法，GC 前调用，**已废弃，不要用**。

## 8. static 关键字
- 修饰变量 → 类变量，所有实例共享，存在方法区。
- 修饰方法 → 静态方法，不能用 this，不能直接调用非静态方法。
- 修饰代码块 → 类加载时执行一次。
- 修饰内部类 → 静态内部类，不依赖外部类实例。

## 9. 深拷贝 vs 浅拷贝
- **浅拷贝**：只复制引用，新旧对象指向同一内存（`Object.clone` 默认行为）。
- **深拷贝**：连同引用对象一起复制，递归克隆所有引用。
- 实现方式：重写 clone() 递归复制 / 序列化 + 反序列化。

## 10. 异常体系
```
Throwable
├── Error        （JVM 错误，OOM、StackOverflow，不应捕获）
└── Exception
    ├── RuntimeException （非受检异常，NPE、ClassCast、ArrayIndexOut）
    └── 其他              （受检异常，IOException、SQLException，必须 throws 或 try-catch）
```
- **追问**：try-catch-finally 中 return 顺序？答：try 的 return 值先暂存，执行 finally，最后返回暂存值。**finally 里 return 会覆盖 try 的 return**（坑！面试常考）。

## 11. throw 和 throws 区别
- `throw`：方法内主动抛异常对象。
- `throws`：方法签名上声明可能抛出的异常。

## 12. Java 反射
- **是什么**：运行时获取类信息、调用方法、访问字段，绕过编译期限制。
- **三种获取 Class 方式**：`类名.class`、`对象.getClass()`、`Class.forName("全限定名")`。
- **用途**：Spring IOC、MyBatis 映射、JSON 序列化、动态代理。
- **缺点**：性能差（JIT 难优化）、破坏封装、可访问 private。

## 13. 泛型与类型擦除
- 泛型只在编译期检查，**运行时擦除为 Object**（或边界类型）。
- 所以 `List<Integer>` 和 `List<String>` 的 `getClass()` 相同。
- **追问**：能 `new T()` 吗？不能，运行时 T 已擦除。

## 14. 自动装箱 / 拆箱
- 装箱：基本类型 → 包装类（`Integer.valueOf`）。
- 拆箱：包装类 → 基本类型（`intValue`）。
- **整型缓存池**：`Integer.valueOf` 对 `-128~127` 范围使用缓存。
```java
Integer a = 127, b = 127;   // true，缓存
Integer c = 128, d = 128;   // false，new 出来的
```

## 15. Object 类有哪些方法
`equals` / `hashCode` / `toString` / `clone` / `getClass` / `notify` / `notifyAll` / `wait` / `finalize`

## 16. hashCode() 和 equals() 的关系
- `equals` 相等 → `hashCode` 必须相等。
- `hashCode` 相等 → `equals` **不一定**相等（哈希冲突）。

## 17. Java 中 IO 模型（BIO / NIO / AIO）
- **BIO**：同步阻塞，每个连接一个线程。
- **NIO**：同步非阻塞，多路复用（Selector），一个线程管多个连接（Netty 基础）。
- **AIO**：异步非阻塞，回调通知。
- **追问**：和 Redis epoll 啥关系？Redis 单线程 + epoll = Java NIO 的原理。

## 18. 接口和抽象类如何选择
- 想定义"能力规范"（如 Comparable）→ 接口。
- 想定义"模板"（部分实现 + 子类补全）→ 抽象类。

## 19. Java 修饰符可见性
| 修饰符 | 类内 | 同包 | 子类 | 其他 |
|---|---|---|---|---|
| private | ✅ | ❌ | ❌ | ❌ |
| 默认 | ✅ | ✅ | ❌ | ❌ |
| protected | ✅ | ✅ | ✅ | ❌ |
| public | ✅ | ✅ | ✅ | ✅ |

## 20. JDK / JRE / JVM 区别
- **JVM**：虚拟机，执行字节码。
- **JRE**：JVM + 运行时类库。
- **JDK**：JRE + 编译器 + 调试工具。

## 21. 值传递 vs 引用传递
- **Java 只有值传递**。
- 基本类型传值的拷贝；引用类型传引用地址的拷贝（所以方法内能改对象属性，但不能让原引用指向新对象）。

## 22. JDK 8 新特性
Lambda 表达式、Stream API、函数式接口、Optional、新日期 API（LocalDateTime）、接口 default 方法、HashMap 链表转红黑树。

---

# 二、Java 集合（18 题）

## 1. Java 集合体系
```
Collection
├── List   （有序、可重复）  ArrayList / LinkedList / Vector
├── Set    （无序、不重复）  HashSet / LinkedHashSet / TreeSet
└── Queue  （队列）         ArrayDeque / LinkedList / PriorityQueue

Map        （键值对）
├── HashMap / LinkedHashMap / TreeMap / Hashtable / ConcurrentHashMap
```

## 2. ArrayList vs LinkedList ⭐
| | ArrayList | LinkedList |
|---|---|---|
| 底层 | 动态数组 | 双向链表 |
| 随机访问 | O(1) | O(n) |
| 头尾插入 | 头插 O(n)/尾插 O(1) | O(1) |
| 中间插入 | O(n) | O(n)（查找慢） |
| 内存 | 紧凑，可能浪费 | 节点开销大 |

**结论**：90% 场景用 ArrayList，LinkedList 几乎不用。

## 3. ArrayList 扩容机制 ⭐
- 默认容量 **10**（首次 add 时才创建数组）。
- 扩容到原来的 **1.5 倍**（`oldCap + (oldCap >> 1)`）。
- 调用 `Arrays.copyOf` 复制到新数组。

## 4. HashMap 底层结构 ⭐⭐⭐（必考）
- **JDK 1.7**：数组 + 链表，头插法（多线程扩容会成环）。
- **JDK 1.8**：数组 + 链表 + 红黑树，尾插法。
- 链表长度 **≥ 8** 且数组长度 **≥ 64** → 转红黑树。
- 红黑树节点数 **≤ 6** → 退化为链表。

## 5. HashMap 为什么容量是 2 的 n 次幂 ⭐
- 计算下标：`(n - 1) & hash`，n 是 2 的幂时 `n-1` 全为 1，**位运算代替取模**，效率高。
- 扩容时元素位置要么在原位、要么在 `原位 + 旧容量`，迁移高效。

## 6. HashMap put 流程
1. 计算 hash：`(h = key.hashCode()) ^ (h >>> 16)`（高低位异或，减少碰撞）。
2. 数组为空 → resize 初始化。
3. 算下标 `(n-1) & hash`，桶为空 → 直接放。
4. 桶非空 → 比较 key，相同则覆盖；不同则尾插链表/红黑树。
5. 链表长 ≥ 8 → 树化。
6. 元素数 > **负载因子 0.75 × 容量** → 扩容 2 倍。

## 7. HashMap 为什么线程不安全 ⭐
- JDK 1.7：并发扩容 + 头插法 → **链表成环**，get 时死循环。
- JDK 1.8：尾插法解决了环，但仍有**数据覆盖**问题（两个线程同时 put 到同一空桶）。

## 8. ConcurrentHashMap 原理 ⭐⭐⭐（必考）
- **JDK 1.7**：分段锁 Segment（继承 ReentrantLock），默认 16 段，并发度 = 段数。
- **JDK 1.8**：抛弃 Segment，用 **CAS + synchronized**，锁粒度细到链表头结点。
  - put：CAS 插入空桶；非空则 synchronized 锁住头节点。
  - size：累加每个 baseCount + CounterCell。

## 9. HashMap vs Hashtable vs ConcurrentHashMap
| | HashMap | Hashtable | ConcurrentHashMap |
|---|---|---|---|
| 线程安全 | ❌ | ✅（全表 synchronized） | ✅（分段/CAS） |
| 性能 | 高 | 极差 | 高 |
| null key/value | 允许 | 不允许 | 不允许 |
| 推荐 | 单线程 | 不用 | 多线程 |

## 10. HashSet 底层
内部就是一个 HashMap，value 是固定的 `PRESENT` 对象。

## 11. LinkedHashMap
HashMap + 双向链表，维持插入顺序或访问顺序（可实现 **LRU 缓存**）。

## 12. TreeMap
基于**红黑树**，key 按自然顺序或 Comparator 排序，操作 O(log n)。

## 13. 红黑树性质（简记）
- 节点非红即黑，根节点黑。
- 红节点的子必须是黑。
- 任一节点到叶子的所有路径黑节点数相同。
- **近似平衡**（最长路径 ≤ 2 × 最短路径）。

## 14. CopyOnWriteArrayList
- 写时复制：写操作复制整个数组、加锁修改、替换原数组。
- 读无锁，**读多写少**场景（如订阅者列表）。
- 缺点：写代价高、数据短暂不一致。

## 15. Fail-Fast 机制
- 遍历集合时被修改 → 抛 `ConcurrentModificationException`。
- 原理：iterator 持有 `expectedModCount`，与集合的 `modCount` 不等就抛错。
- 解决：用 `Iterator.remove()` 或 `CopyOnWriteArrayList`。

## 16. ArrayList 和 Vector
Vector 老古董，所有方法 synchronized，性能差，已被 ArrayList + Collections.synchronizedList 替代。

## 17. Comparable 和 Comparator
- `Comparable`：内部排序，`compareTo`，类实现接口。
- `Comparator`：外部排序，`compare`，作参数传给排序方法。

## 18. 集合工具类
- `Collections`：`sort` / `reverse` / `synchronizedXxx` / `unmodifiableXxx`
- `Arrays`：`asList` / `sort` / `copyOf`

---

# 三、Java 并发（35 题，含前置）

## 【前置 A】进程 vs 线程
- **进程**：操作系统资源分配的最小单位，独立内存。
- **线程**：CPU 调度的最小单位，**共享进程的内存**，所以才有并发问题。

## 【前置 B】并发三大特性 ⭐⭐⭐（理解这个才能看懂后面）
1. **原子性**：操作不可分割（i++ 不是原子，分 3 步：读、加、写）。
2. **可见性**：一个线程改了共享变量，其他线程能立刻看到。
3. **有序性**：代码执行顺序不被重排（CPU/编译器会重排指令优化性能）。

> 并发的所有问题都是这三个出了问题，**所有解决方案（synchronized/volatile/Lock）都是在解决这三个**。

## 【前置 C】Java 内存模型 JMM ⭐⭐⭐
- 每个线程有自己的**工作内存**，共享变量在**主内存**。
- 线程改变量：主内存 → 工作内存（read/load）→ 修改 → 工作内存 → 主内存（store/write）。
- **可见性问题**就来源于此：A 线程改了工作内存还没刷回主内存，B 线程读不到。

## 【前置 D】happens-before 原则
JMM 规定的 8 条偏序关系，保证前一个操作的结果对后续操作可见。关键几条：
- 程序顺序规则：一个线程内，前面的操作 happens-before 后面的。
- 锁规则：unlock happens-before 后续的 lock。
- volatile 规则：写 happens-before 后续的读。
- 传递性：A→B, B→C 则 A→C。

---

## 1. 创建线程的方式
1. 继承 Thread，重写 run()。
2. 实现 Runnable，传给 Thread。
3. 实现 Callable，配合 FutureTask（有返回值、可抛异常）。
4. 线程池（推荐）。

## 2. Runnable vs Callable
- Runnable：`run()` 无返回值，不抛异常。
- Callable：`call()` 有返回值，抛异常，配合 Future 拿结果。

## 3. 线程的 6 个状态
```
NEW          → 创建未启动
RUNNABLE     → 运行中或就绪（Java 不区分）
BLOCKED      → 等待 synchronized 锁
WAITING      → 无限等待（wait/join 无超时）
TIMED_WAITING→ 限时等待（sleep/wait 有超时）
TERMINATED   → 结束
```

## 4. sleep vs wait ⭐
| | sleep | wait |
|---|---|---|
| 所属 | Thread 静态方法 | Object 方法 |
| 释放锁 | **不释放** | **释放** |
| 调用位置 | 任何地方 | 必须在 synchronized 内 |
| 唤醒 | 时间到自动 | 必须 notify/notifyAll |

## 5. wait/notify 为什么定义在 Object
因为锁是任意对象，wait/notify 是基于锁对象的等待队列，所以必须每个对象都有。

## 6. start() vs run()
- `run()`：当作普通方法调用，**单线程**执行。
- `start()`：JVM 创建新线程，再由新线程调用 run()。

## 7. synchronized 原理 ⭐⭐⭐（必考）
- **修饰对象**：
  - 实例方法 → 锁 this
  - 静态方法 → 锁 Class 对象
  - 代码块 → 锁指定对象
- **底层**：基于 **Monitor**（监视器锁），每个对象头有指向 Monitor 的指针。
  - 同步方法：方法标记 `ACC_SYNCHRONIZED`。
  - 同步代码块：编译为 `monitorenter` / `monitorexit` 指令。

## 8. synchronized 锁升级 ⭐⭐⭐
JDK 6 优化，4 种状态依次升级（**不可降级**）：
```
无锁 → 偏向锁 → 轻量级锁 → 重量级锁
```
- **偏向锁**：只有一个线程访问，对象头记录线程 ID，无需 CAS。
- **轻量级锁**：少量竞争，CAS 自旋。
- **重量级锁**：大量竞争，进入 Monitor 阻塞队列（操作系统 mutex，开销大）。

## 9. volatile 原理 ⭐⭐⭐（必考）
- **保证可见性**：写操作立刻刷主内存，并使其他线程缓存失效（基于 CPU 缓存一致性 MESI 协议）。
- **禁止指令重排**：通过**内存屏障**（Memory Barrier）实现。
- **不保证原子性**：`volatile int i; i++` 仍线程不安全。

**典型应用**：单例模式 DCL（双重检查锁）
```java
private volatile static Singleton instance;  // 防止 new 半初始化对象被另一线程拿到
```

## 10. synchronized vs volatile
| | synchronized | volatile |
|---|---|---|
| 原子性 | ✅ | ❌ |
| 可见性 | ✅ | ✅ |
| 有序性 | ✅ | ✅ |
| 阻塞 | 阻塞 | 不阻塞 |
| 修饰 | 方法/代码块 | 变量 |

## 11. synchronized vs ReentrantLock ⭐
| | synchronized | ReentrantLock |
|---|---|---|
| 实现 | JVM 关键字 | API（AQS） |
| 释放锁 | 自动 | **必须手动 unlock**（finally 中） |
| 可中断 | ❌ | ✅ `lockInterruptibly` |
| 公平锁 | ❌ | ✅（构造参数） |
| 条件变量 | 一个（wait/notify） | 多个（newCondition） |
| 性能 | JDK 6 后优化，差不多 | 灵活但需手写 |

## 12. ReentrantLock 是怎么实现的
基于 **AQS**（AbstractQueuedSynchronizer）。

## 13. AQS 原理 ⭐⭐⭐（必考）
- 全名：**抽象队列同步器**。
- 核心：**volatile int state** + **CLH 双向等待队列**。
- 加锁：CAS 改 state，失败则入队阻塞（park）。
- 释放：改 state，唤醒队首（unpark）。
- **谁用了**：ReentrantLock、CountDownLatch、Semaphore、ReentrantReadWriteLock。

## 14. CAS 原理 ⭐⭐⭐
- Compare And Swap：比较并交换。
- 三个值：`内存值 V`、`期望值 E`、`新值 N`。如果 V == E 则改为 N，否则什么都不做。
- 底层：CPU 的 `cmpxchg` 指令，**硬件级原子操作**。
- Java 中：`Unsafe.compareAndSwapInt`，`AtomicInteger` 等就用它。

## 15. CAS 的 ABA 问题 ⭐
- 线程 1 读到 A，准备改成 C；线程 2 把 A→B→A。
- 线程 1 CAS 成功，但中间状态被忽略了。
- **解决**：`AtomicStampedReference`（加版本号）。

## 16. 原子类 Atomic
基于 CAS 实现，无锁线程安全。常用：`AtomicInteger` / `AtomicLong` / `AtomicReference` / `LongAdder`（高并发更优，分段累加）。

## 17. 线程池七大参数 ⭐⭐⭐（必考必背）
```java
new ThreadPoolExecutor(
    int corePoolSize,           // 核心线程数
    int maximumPoolSize,        // 最大线程数
    long keepAliveTime,         // 非核心线程空闲存活时间
    TimeUnit unit,              // 时间单位
    BlockingQueue workQueue,    // 任务队列
    ThreadFactory threadFactory,// 线程工厂（命名用）
    RejectedExecutionHandler handler  // 拒绝策略
);
```

## 18. 线程池工作流程 ⭐⭐⭐
1. 任务来 → 核心线程没满，**创建核心线程**。
2. 核心满 → 进**任务队列**。
3. 队列满 → 创建非核心线程，直到 maxPoolSize。
4. 全满 → 执行**拒绝策略**。

## 19. 四种拒绝策略
- **AbortPolicy**（默认）：抛 RejectedExecutionException。
- **CallerRunsPolicy**：调用者线程自己执行。
- **DiscardPolicy**：默默丢弃。
- **DiscardOldestPolicy**：丢弃队列最老的，把新任务加入。

## 20. 常见线程池（Executors）
- `newFixedThreadPool`：固定大小，**队列无界**（OOM 风险）。
- `newCachedThreadPool`：核心 0，**最大 Integer.MAX_VALUE**（创建过多线程 OOM）。
- `newSingleThreadExecutor`：单线程，队列无界。
- `newScheduledThreadPool`：定时任务。

**阿里规范**：禁止用 Executors 创建，必须 `new ThreadPoolExecutor` 显式指定参数。

## 21. 线程池如何合理设置大小
- CPU 密集型：`N + 1`（N 为核数）。
- IO 密集型：`2N` 或更多（IO 等待时让别的线程跑）。

## 22. ThreadLocal 原理 ⭐⭐⭐（必考，你简历项目2用了！）
- **作用**：线程私有变量，每个线程独立副本，互不影响。
- **典型用途**：保存当前登录用户、数据库连接、SimpleDateFormat（线程不安全）。
- **底层结构**：
  ```
  Thread 对象内部 → ThreadLocalMap (key: ThreadLocal, value: 值)
  ```
  注意是 Thread 持有 Map，不是 ThreadLocal 持有！

## 23. ThreadLocal 内存泄漏 ⭐⭐⭐
- ThreadLocalMap 的 **key 是弱引用**（GC 时被回收），**value 是强引用**。
- 如果 ThreadLocal 没了，key=null，但 value 还在，**线程不结束就一直占内存**。
- **解决**：用完手动调 `threadLocal.remove()`（特别是线程池场景，线程复用）。

## 24. ThreadLocal 为什么用弱引用
为了让 ThreadLocal 对象本身能被 GC 回收，避免一定泄漏（但 value 还需手动 remove）。

## 25. InheritableThreadLocal
父线程可以传值给子线程（但线程池场景不行，因为线程是复用的不是新建的 → 用 `TransmittableThreadLocal`）。

## 26. 死锁四大必要条件
1. **互斥**：资源同一时刻只能被一个线程占用。
2. **占有并等待**：持有资源同时请求新资源。
3. **不可剥夺**：资源不能被强制释放。
4. **循环等待**：线程之间形成环路等待。

**破坏任一条件即可避免**，最常用：**按固定顺序加锁**。

## 27. 如何排查死锁
- `jstack` 命令打印线程栈，能看到 "Found one Java-level deadlock"。
- `jconsole` / `jvisualvm` 图形化检测。
- Arthas 在线诊断。

## 28. 乐观锁 vs 悲观锁
- **乐观**：假设没冲突，提交时检查（CAS、version 字段）。
- **悲观**：假设一定冲突，先加锁（synchronized、for update）。

## 29. 公平锁 vs 非公平锁
- **公平**：按申请顺序获取（队列 FIFO），无饥饿但吞吐低。
- **非公平**：插队，吞吐高但可能饥饿，**synchronized 和 ReentrantLock 默认都是非公平**。

## 30. 可重入锁
同一线程可多次获取同一把锁，不会死锁。synchronized 和 ReentrantLock 都可重入。

## 31. 读写锁 ReentrantReadWriteLock
- 读读共享、读写互斥、写写互斥。
- 适合**读多写少**场景。

## 32. 阻塞队列 BlockingQueue
线程池底层用的。常见实现：
- `ArrayBlockingQueue`：数组、有界。
- `LinkedBlockingQueue`：链表、默认无界（线程池 OOM 元凶）。
- `SynchronousQueue`：不存元素，直接传递（CachedThreadPool 用它）。
- `DelayQueue`：延迟队列。
- `PriorityBlockingQueue`：优先级队列。

## 33. CountDownLatch / CyclicBarrier / Semaphore
- **CountDownLatch**：倒计数，N 个线程完成后主线程才继续（用一次）。
- **CyclicBarrier**：让一组线程互相等待到达屏障再一起走（可循环）。
- **Semaphore**：信号量，控制并发数（限流）。

## 34. ForkJoinPool
分治思想，**工作窃取**（空闲线程偷其他线程队列里的任务），并行流 `parallelStream` 底层用它。

## 35. 线程间通信方式
- volatile 共享变量
- wait/notify
- Lock + Condition
- BlockingQueue
- CountDownLatch / CyclicBarrier

---

# 四、JVM（20 题）

## 1. JVM 内存结构 ⭐⭐⭐（必考必背）
```
线程私有：
├── 程序计数器     当前线程执行字节码的行号指示器（唯一不会 OOM）
├── 虚拟机栈       存方法的栈帧（局部变量表、操作数栈），StackOverflow / OOM
└── 本地方法栈     执行 native 方法

线程共享：
├── 堆             对象实例，GC 主战场
└── 方法区/元空间   类信息、常量、静态变量（JDK 8 后用元空间，在直接内存）
```

## 2. 堆的结构
```
新生代（1/3）
├── Eden（8）
├── Survivor 0（1）
└── Survivor 1（1）

老年代（2/3）
```

## 3. 对象创建过程
1. 类加载检查（没加载 → 加载）
2. 分配内存（指针碰撞 / 空闲列表）
3. 初始化零值
4. 设置对象头（hash、GC 年龄、锁状态、类型指针）
5. 执行 `<init>` 方法

## 4. 对象内存布局
```
对象头（Header）→ Mark Word + 类型指针
实例数据
对齐填充（8 字节倍数）
```

## 5. 如何判断对象死亡 ⭐
- **引用计数法**：计数为 0 即死亡。**缺点：循环引用无法回收**。
- **可达性分析**（JVM 实际用的）：从 **GC Roots** 出发，不可达即死亡。

## 6. GC Roots 有哪些
- 虚拟机栈中引用的对象
- 静态变量引用的对象
- 常量引用的对象
- 本地方法栈引用的对象

## 7. 四种引用 ⭐
- **强引用**：`Object o = new Object()`，永远不回收。
- **软引用** SoftReference：内存不足时回收（适合缓存）。
- **弱引用** WeakReference：下次 GC 就回收（ThreadLocalMap 的 key）。
- **虚引用** PhantomReference：完全形同虚设，仅用于跟踪回收。

## 8. 垃圾回收算法
- **标记-清除**：碎片多。
- **复制**：内存减半，无碎片，**新生代用**（Eden + Survivor 复制存活）。
- **标记-整理**：清除后整理，**老年代用**。
- **分代收集**：综合上述，按区域选算法。

## 9. 分代收集思想
- **新生代**：朝生夕死，对象多用复制算法。
- **老年代**：存活率高，用标记-整理 / 标记-清除。

## 10. Minor GC / Major GC / Full GC
- **Minor GC（Young GC）**：新生代，频繁、快。
- **Major GC（Old GC）**：老年代。
- **Full GC**：整个堆 + 方法区，**最慢，要避免**。

## 11. 对象什么时候进老年代
- Survivor 中年龄 **≥ 15**（每熬过一次 GC 年龄 +1）。
- **大对象**直接进老年代（`-XX:PretenureSizeThreshold`）。
- **动态年龄判断**：Survivor 中同年龄对象 > 一半，所有 ≥ 该年龄的进老年代。
- Survivor 放不下，触发**担保机制**进老年代。

## 12. 垃圾收集器 ⭐
- **Serial**：单线程，老古董。
- **ParNew**：Serial 多线程版（新生代）。
- **Parallel Scavenge**：吞吐量优先（JDK 8 默认新生代）。
- **CMS**：老年代，并发标记清除，**追求低停顿**，碎片多。
- **G1**（JDK 9 默认）：分区 Region，可预测停顿，全代通吃。
- **ZGC**：超低停顿（<10ms），适合大堆。

## 13. CMS 四阶段
1. 初始标记（STW，标 GC Roots 直接引用）
2. 并发标记（与用户线程并发）
3. 重新标记（STW，处理并发期间变化）
4. 并发清除

## 14. G1 特点
- 不再分新老年代物理区域，整堆切成多个 **Region**（每个可为 Eden/Survivor/Old/Humongous）。
- 优先回收价值最大（垃圾最多）的 Region → **Garbage First**。
- 可设置最大停顿时间目标。

## 15. 类加载过程 ⭐
```
加载 → 验证 → 准备 → 解析 → 初始化
```
- **加载**：读取 .class 字节码，生成 Class 对象。
- **验证**：文件格式、元数据、字节码、符号引用。
- **准备**：给静态变量分配内存 + **零值**（不是初始值）。
- **解析**：符号引用 → 直接引用。
- **初始化**：执行 `<clinit>`（静态变量赋值、静态代码块）。

## 16. 类加载器 ⭐
- **BootstrapClassLoader**（启动类加载器）：加载 `JAVA_HOME/lib`，C++ 写的，获取不到引用。
- **ExtensionClassLoader**（扩展类加载器）：加载 `JAVA_HOME/lib/ext`。
- **ApplicationClassLoader**（应用类加载器）：加载 classpath，默认加载器。
- **自定义类加载器**：继承 ClassLoader。

## 17. 双亲委派模型 ⭐⭐⭐
- 子加载器收到请求，**先委托父加载器**加载，父加载不了再自己加载。
- **好处**：
  1. 避免重复加载。
  2. 安全（核心类如 java.lang.Object 一定由 Bootstrap 加载，不会被篡改）。
- **破坏案例**：JDBC、Tomcat、SPI。

## 18. 内存溢出 vs 内存泄漏
- **OOM**：申请不到足够内存。
- **Leak**：对象用完没释放，长期占用 → 最终 OOM。
- 常见 Leak：ThreadLocal 没 remove、静态集合存大量对象、未关闭的 IO/连接。

## 19. JVM 调优常用参数
```
-Xms512m    -Xmx2g           初始堆 / 最大堆
-Xmn256m                     新生代大小
-Xss512k                     栈大小
-XX:MetaspaceSize=128m       元空间初始
-XX:+UseG1GC                 用 G1
-XX:MaxGCPauseMillis=200     G1 目标停顿
-XX:+PrintGCDetails          打印 GC 详情
-XX:+HeapDumpOnOutOfMemoryError  OOM 时 dump 堆
```

## 20. 常用排查工具
- **jps**：查 Java 进程。
- **jstat**：GC 统计。
- **jstack**：线程栈（查死锁）。
- **jmap**：堆 dump。
- **jconsole / jvisualvm**：图形化。
- **Arthas**（阿里）：在线诊断神器。
- **MAT**：分析 heap dump 找泄漏。

---

# 五、附录：高频追问串讲

## 串讲 1：HashMap 全家桶
> 面试官问 HashMap，必连环问到 ConcurrentHashMap、线程安全、扩容、红黑树。准备好这条链：
> 
> 结构 → put 流程 → 扩容 → 为什么 2 的幂 → 1.7/1.8 区别 → 线程安全问题 → ConcurrentHashMap 1.7/1.8 → 为什么用 synchronized 代替 ReentrantLock

## 串讲 2：synchronized 全家桶
> 原理 → 锁升级 → 和 volatile 对比 → 和 ReentrantLock 对比 → 锁优化（锁消除、锁粗化、自旋锁）

## 串讲 3：ThreadLocal 全家桶（你简历必问！）
> 用途 → 底层 ThreadLocalMap 结构 → key 弱引用原因 → 内存泄漏原因 → 为什么用完必须 remove → 线程池场景特别危险 → InheritableThreadLocal / TransmittableThreadLocal

## 串讲 4：线程池全家桶
> 七大参数 → 工作流程 → 拒绝策略 → 为什么不用 Executors → 怎么定核心线程数 → 阻塞队列选哪个 → 线程池里抛异常怎么办（submit 吞掉，execute 抛出）

## 串讲 5：JVM 全家桶
> 内存结构 → 堆分代 → 对象创建 → 可达性分析 → 四种引用 → GC 算法 → 收集器 → 类加载过程 → 双亲委派

## 串讲 6：并发三特性 + JMM
> 三特性是因 → JMM 是模型 → happens-before 是规则 → synchronized/volatile/Lock 是解决方案 → CAS / AQS 是底层实现

---

## 最后小妹的话

兄长大人～这份文档**先理解前置概念（并发三特性、JMM、对象头）**，再啃 synchronized/volatile/AQS 就不头疼啦～

**学习节奏建议**：
- 每天精读 1 个模块 + 录音口述 5 题
- 必背：标⭐⭐⭐ 的题（约 25 题）
- 必懂前置：JMM、并发三特性、对象头
- 配合项目讲：ThreadLocal、ConcurrentHashMap、synchronized、线程池

加油哒！(≧▽≦) 七月初的实习等你～💕
