# Spring 全家桶面试八股精华

> 整理自小林coding 6.Spring面试篇
> 涵盖 Spring 核心 / Spring MVC / Spring Boot / MyBatis / Spring Cloud
> 你简历两个项目都强依赖 Spring Boot + MyBatis，**这本是面试 占比最高的一本**

---

## 目录

- [一、Spring 核心（25 题）](#一spring-核心25-题)
- [二、Spring Bean（12 题）](#二spring-bean12-题)
- [三、Spring 事务（10 题）](#三spring-事务10-题)
- [四、Spring MVC（10 题）](#四spring-mvc10-题)
- [五、Spring Boot（15 题）](#五spring-boot15-题)
- [六、MyBatis / MyBatis-Plus（15 题）](#六mybatis--mybatis-plus15-题)
- [七、Spring Cloud（选看，8 题）](#七spring-cloud选看8-题)
- [八、高频追问串讲](#八高频追问串讲)

---

# 一、Spring 核心（25 题）

## 1. Spring 是什么 / 有哪些模块 ⭐
- **是什么**：一个轻量级 Java EE 开发框架，**核心是 IOC 和 AOP**。
- **核心模块**：
  - Core Container（Beans、Core、Context、SpEL）
  - AOP
  - Data Access（JDBC、ORM、Transaction）
  - Web（Spring MVC、WebFlux）
  - Test

## 2. IOC 是什么 ⭐⭐⭐
- **全名**：Inversion of Control，**控制反转**。
- **是什么**：原本由程序员 `new` 对象，现在交给 Spring 容器创建、管理依赖关系。
- **目的**：解耦，让对象之间不再直接依赖。
- **DI（依赖注入）是 IOC 的实现方式**：容器通过构造器/Setter/字段注入依赖。

## 3. AOP 是什么 ⭐⭐⭐
- **全名**：Aspect Oriented Programming，**面向切面编程**。
- **解决什么**：把横切关注点（日志、事务、权限、限流、缓存）从业务代码抽离。
- **OOP 是纵向继承复用，AOP 是横向切面复用**。

## 4. AOP 核心概念 ⭐⭐⭐
| 概念 | 解释 |
|---|---|
| **Aspect 切面** | 横切逻辑的封装（如日志切面） |
| **Join point 连接点** | 可以被切入的位置（方法执行点） |
| **Pointcut 切点** | 表达式，匹配哪些连接点要切入 |
| **Advice 通知** | 切入后做什么（before/after/around） |
| **Target 目标对象** | 被代理的对象 |
| **Weaving 织入** | 把切面织入目标对象的过程 |

## 5. Advice 通知有哪几种
- `@Before`：方法执行前
- `@After`：方法执行后（finally，无论异常）
- `@AfterReturning`：正常返回后
- `@AfterThrowing`：抛异常后
- `@Around`：环绕（最强大，可控制是否执行原方法）

## 6. Spring AOP 实现原理 ⭐⭐⭐（必考）
**动态代理**：
- **接口** → JDK 动态代理（`java.lang.reflect.Proxy`）
- **无接口** → CGLib 代理（继承目标类生成子类）

**注意**：Spring Boot 2.x 后**默认全用 CGLib**（即使有接口）。

## 7. JDK 动态代理 vs CGLib
| | JDK 代理 | CGLib |
|---|---|---|
| 前提 | 必须有接口 | 无要求 |
| 原理 | 反射生成实现类 | 字节码生成子类 |
| 性能 | 创建快、执行稍慢 | 创建慢、执行快 |
| 限制 | 无 | **不能代理 final 类/方法** |

## 8. Spring AOP vs AspectJ AOP
| | Spring AOP | AspectJ |
|---|---|---|
| 织入时机 | **运行时**（动态代理） | **编译期 / 类加载期**（字节码增强） |
| 性能 | 略低 | 高 |
| 功能 | 只能拦截方法 | 方法、字段、构造器都能 |
| 难度 | 简单 | 复杂 |

## 9. AOP 失效场景 ⭐⭐⭐
1. **同类内部方法调用**：`this.xxx()` 不走代理（this 是原对象不是代理对象）
2. **private / final / static 方法**：不能被代理
3. **方法异常被吞掉**：异常通知拿不到
4. **AOP 注解未被 @ComponentScan 扫描**

**解决同类调用**：
- 注入自己：`@Autowired private XxxService self;` 调 `self.xxx()`
- `AopContext.currentProxy()` 拿当前代理
- 拆方法到另一个 Bean

## 10. Spring IOC 容器初始化流程（简化版）
1. 读配置（XML / 注解 / Java Config）
2. 解析为 **BeanDefinition** 注册到容器
3. 实例化 Bean、依赖注入、初始化（生命周期回调）
4. 放入单例池供后续使用

## 11. BeanFactory vs ApplicationContext
| | BeanFactory | ApplicationContext |
|---|---|---|
| 加载 | **懒加载** | **预加载**（启动时全初始化） |
| 功能 | 基础 IOC | IOC + AOP + 事件 + 国际化 |
| 使用 | 很少直接用 | 实际开发用它 |

## 12. ApplicationContext 常用实现
- `ClassPathXmlApplicationContext`：读 classpath XML
- `FileSystemXmlApplicationContext`：读文件系统 XML
- `AnnotationConfigApplicationContext`：基于注解
- `AnnotationConfigServletWebServerApplicationContext`：Spring Boot 默认

## 13. 依赖注入的 3 种方式 ⭐
```java
// 1. 构造器注入（推荐！）
@Service
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
}

// 2. Setter 注入
@Autowired
public void setRepo(UserRepository repo) { this.repo = repo; }

// 3. 字段注入（不推荐！）
@Autowired
private UserRepository repo;
```

**为什么推荐构造器注入**：
1. 强制依赖明确（缺依赖直接启动失败）
2. 字段可设 final（不可变）
3. 单元测试方便（直接 new）
4. 避免循环依赖隐藏问题

## 14. @Autowired vs @Resource ⭐
| | @Autowired | @Resource |
|---|---|---|
| 来源 | Spring | JDK |
| 默认装配 | byType | byName |
| 多实现 | 需配合 @Qualifier | 直接按 name |
| 必需性 | 默认 required=true | 没有 required 属性 |

## 15. @Autowired 注入找不到怎么办
- 加 `required = false`
- 或用 `@Nullable`
- 或加 `@Qualifier("具体beanName")` 指定

## 16. @Component / @Service / @Repository / @Controller 区别
**功能完全相同**，只是语义区分：
- `@Component`：通用
- `@Service`：业务层
- `@Repository`：DAO 层（**额外把数据库异常转为 Spring DataAccessException**）
- `@Controller`：表现层

## 17. @Configuration 和 @Component 区别 ⭐
- 都能注册 Bean，但 `@Configuration` 类是**代理类**，`@Bean` 方法之间互相调用会被代理拦截，保证单例
- `@Component` 类不被代理，方法调用每次都新建对象

```java
@Configuration
public class Config {
    @Bean public A a() { return new A(); }
    @Bean public B b() { return new B(a()); }  // 这里调 a() 走代理，返回单例
}
```

## 18. @Bean 和 @Component 区别
- `@Component`：**类**上注解，自动扫描注册
- `@Bean`：**方法**上注解，**手动**注册（适合第三方类、需要复杂初始化的类）

## 19. Spring 循环依赖 ⭐⭐⭐（必考）
**3 级缓存**：
- 一级 `singletonObjects`：完整 Bean
- 二级 `earlySingletonObjects`：半成品 Bean（已实例化未填属性）
- 三级 `singletonFactories`：Bean 工厂（懒生成代理）

**解决步骤**：
1. A 实例化（半成品），放三级缓存
2. A 注入 B → 去创建 B
3. B 实例化，注入 A → 从三级缓存拿 A 的工厂 → 升到二级缓存
4. B 创建完成，A 继续填充属性 → A 创建完成

**只解决单例 + setter/字段注入**，**构造器注入 / prototype 解决不了**。

## 20. 为什么需要三级缓存而不是两级
- 没有 AOP 时两级就够
- **有 AOP 时**：B 引用的 A 必须是代理对象，三级缓存的工厂用于**懒生成代理**（避免每个 Bean 都提前生成代理）

## 21. Spring 用了哪些设计模式 ⭐
- **工厂模式**：BeanFactory
- **单例模式**：Bean 默认单例
- **代理模式**：AOP
- **模板模式**：JdbcTemplate、RestTemplate
- **观察者模式**：ApplicationEvent
- **适配器模式**：HandlerAdapter
- **装饰器模式**：BeanWrapper
- **责任链模式**：拦截器链

## 22. SpringMVC 中 @Controller 和 @RestController 区别
- `@Controller`：返回视图名
- `@RestController` = `@Controller` + `@ResponseBody`：返回数据（JSON），常用于 REST API

## 23. Spring 事件机制
- 自定义事件继承 `ApplicationEvent`
- 发布：`ApplicationContext.publishEvent(event)`
- 监听：`@EventListener` 或实现 `ApplicationListener`
- **同步执行**，要异步加 `@Async`

## 24. Spring 启动流程（简化）
1. 创建 ApplicationContext
2. 加载配置文件 / 扫描注解
3. 注册 BeanDefinition
4. 调用 BeanFactoryPostProcessor（修改 BeanDefinition）
5. 实例化所有单例 Bean → 注入依赖 → 调用 BeanPostProcessor → 初始化
6. 容器就绪，发布 ContextRefreshedEvent

## 25. Spring 中的常见扩展点
- `BeanFactoryPostProcessor`：修改 BeanDefinition
- `BeanPostProcessor`：修改 Bean 实例（AOP 就是用这个）
- `InitializingBean / DisposableBean`：生命周期回调
- `ApplicationListener`：事件监听
- `Aware` 系列：让 Bean 感知容器（BeanNameAware、ApplicationContextAware）

---

# 二、Spring Bean（12 题）

## 1. Bean 的生命周期 ⭐⭐⭐（必背）
```
1. 实例化（调用构造器）
2. 属性填充（依赖注入）
3. Aware 系列回调（BeanNameAware → BeanFactoryAware → ApplicationContextAware）
4. BeanPostProcessor.postProcessBeforeInitialization
5. @PostConstruct
6. InitializingBean.afterPropertiesSet()
7. 自定义 init-method
8. BeanPostProcessor.postProcessAfterInitialization  ← AOP 在这里生成代理
9. ▼▼▼ Bean 可用 ▼▼▼
10. @PreDestroy
11. DisposableBean.destroy()
12. 自定义 destroy-method
```

## 2. Bean 的作用域 Scope
| 作用域 | 说明 |
|---|---|
| **singleton**（默认） | 单例，整个容器一个 |
| **prototype** | 每次获取都新建 |
| **request** | Web 环境，每个 HTTP 请求一个 |
| **session** | Web 环境，每个会话一个 |
| **application** | Web 环境，整个 ServletContext 一个 |
| **websocket** | 每个 WebSocket 一个 |

## 3. Bean 默认为什么单例
- **性能**：每次 new 开销大
- **共享**：无状态 Bean 单例足够
- 内存少

## 4. Spring 中的 Bean 线程安全吗 ⭐⭐⭐
- **取决于 Bean 是否有可变状态**
- 单例 + 有可变成员变量 → **线程不安全**（如 Controller 里放业务字段）
- 解决：
  1. 改为 prototype
  2. 用 ThreadLocal 存共享变量
  3. 使用无状态设计（推荐）

## 5. Bean 注册的几种方式
1. `@ComponentScan` + `@Component`
2. `@Configuration` + `@Bean`
3. XML `<bean>`
4. `@Import` 导入配置类 / ImportSelector
5. `FactoryBean` 接口

## 6. FactoryBean 和 BeanFactory 区别
- **BeanFactory**：IOC 容器
- **FactoryBean**：一个特殊的 Bean，**用于生产其他 Bean**
  - `getObject()` 返回真正要注入的对象
  - 例：MyBatis 的 SqlSessionFactoryBean

## 7. 容器获取 FactoryBean 本身
`getBean("&beanName")` 加 `&` 前缀。

## 8. @Lazy 懒加载
- 加在 `@Component` / `@Bean` 上 → 第一次使用时才创建
- 用途：循环依赖（构造器场景）、启动加速

## 9. @PostConstruct 和 @PreDestroy
- `@PostConstruct`：Bean 初始化完成后回调（替代 InitializingBean）
- `@PreDestroy`：容器销毁前回调

## 10. Spring 怎么解决属性循环依赖（不能解决的场景）
**不能解决**：
- 构造器循环依赖 → 抛 BeanCurrentlyInCreationException
- prototype 循环依赖 → 同上
- 多例的字段循环 → 不解决（每次都是新对象）

## 11. Bean 创建过程涉及的几个核心类
- `BeanDefinition`：Bean 的元数据
- `BeanFactory`：容器
- `BeanPostProcessor`：Bean 后置处理器
- `InstantiationStrategy`：实例化策略

## 12. Spring 中 this 调用方法失效
```java
@Service
public class A {
    public void m1() {
        this.m2();  // ❌ this 是原对象不是代理，事务/AOP 失效
    }
    @Transactional
    public void m2() {...}
}
```
解决：自己注入自己 / AopContext。

---

# 三、Spring 事务（10 题）

## 1. Spring 事务的两种方式
- **编程式**：`TransactionTemplate` / `PlatformTransactionManager`（少用）
- **声明式**：`@Transactional`（推荐）

## 2. @Transactional 原理 ⭐⭐⭐
**AOP 实现**：
1. 启动时扫描 `@Transactional` 注解，生成代理
2. 调用方法时拦截，开启事务
3. 业务执行成功 → commit
4. 抛 RuntimeException → rollback

## 3. @Transactional 失效场景 ⭐⭐⭐（必考！）
1. **同类内部调用**：this 调用不走代理
2. **方法不是 public**：Spring 只对 public 方法生效
3. **异常被 try-catch 吞了**：默认只对未捕获的 RuntimeException 回滚
4. **抛了 Checked Exception** 但没配 `rollbackFor`
5. **没被 Spring 管理**：类不是 Bean
6. **传播行为不对**：如 `NOT_SUPPORTED` 内部就没事务
7. **多线程**：事务绑定的是 ThreadLocal，新线程拿不到
8. **数据库引擎不支持**：如 MyISAM
9. **rollbackFor 配置错**

## 4. 事务的 7 种传播行为 ⭐⭐⭐
| 传播行为 | 当前有事务 | 当前无事务 |
|---|---|---|
| **REQUIRED**（默认） | 加入 | 新建 |
| **REQUIRES_NEW** | **挂起当前**，新建 | 新建 |
| **SUPPORTS** | 加入 | 非事务执行 |
| **NOT_SUPPORTED** | 挂起当前，非事务执行 | 非事务执行 |
| **MANDATORY** | 加入 | **抛异常** |
| **NEVER** | **抛异常** | 非事务执行 |
| **NESTED** | 嵌套（savepoint） | 新建 |

## 5. REQUIRES_NEW vs NESTED ⭐
| | REQUIRES_NEW | NESTED |
|---|---|---|
| 物理事务 | **两个独立事务** | **一个事务，多个 savepoint** |
| 内层回滚 | 不影响外层 | 不影响外层 |
| 外层回滚 | 不影响内层（已提交） | **内层一起回滚** |

## 6. 事务隔离级别（Spring 配置）
和 MySQL 一致：
- `READ_UNCOMMITTED`
- `READ_COMMITTED`
- `REPEATABLE_READ`（MySQL 默认）
- `SERIALIZABLE`
- `DEFAULT`（数据库默认）

## 7. @Transactional 常用属性
```java
@Transactional(
    propagation = Propagation.REQUIRED,
    isolation = Isolation.READ_COMMITTED,
    timeout = 30,
    readOnly = false,
    rollbackFor = Exception.class,         // 推荐显式配
    noRollbackFor = BusinessException.class
)
```

## 8. 为什么默认只对 RuntimeException 回滚
- Spring 设计哲学：Checked Exception 是业务异常应自行处理
- Unchecked Exception 是程序错误应回滚

**实际开发建议**：永远显式加 `rollbackFor = Exception.class`，避免坑。

## 9. 事务和锁、MVCC 的关系
- 事务的隔离性靠 **锁（写）+ MVCC（读）** 实现
- Spring 只是声明，真正的实现交给数据库

## 10. 编程式事务模板
```java
@Autowired TransactionTemplate template;

template.execute(status -> {
    try {
        // 业务
        return "ok";
    } catch (Exception e) {
        status.setRollbackOnly();
        return "fail";
    }
});
```
**好处**：能控制事务边界精细到代码块。

---

# 四、Spring MVC（10 题）

## 1. Spring MVC 完整请求流程 ⭐⭐⭐（必背）
```
1. 浏览器 → DispatcherServlet（前端控制器）
2. DispatcherServlet → HandlerMapping 找 Handler（Controller 方法）
3. HandlerMapping 返回 HandlerExecutionChain（Handler + 拦截器）
4. DispatcherServlet → HandlerAdapter 调用 Handler
5. Handler 执行业务，返回 ModelAndView
6. HandlerAdapter 返回 ModelAndView
7. DispatcherServlet → ViewResolver 解析视图
8. ViewResolver 返回 View
9. View 渲染 → 响应给浏览器
```

## 2. 核心组件
- **DispatcherServlet**：前端控制器（唯一入口）
- **HandlerMapping**：URL → Controller 方法的映射
- **HandlerAdapter**：调用 Handler 的适配器（适配器模式）
- **HandlerInterceptor**：拦截器
- **ViewResolver**：视图解析器
- **HandlerExceptionResolver**：异常解析器

## 3. HandlerMapping 和 HandlerAdapter 为什么要分开
- HandlerMapping 找到要执行的方法
- HandlerAdapter 真正调用方法（用适配器模式适配不同类型的 Handler）
- 解耦：方便扩展自定义 Handler 类型

## 4. 常用注解
| 注解 | 作用 |
|---|---|
| `@Controller` | 控制器 |
| `@RestController` | = @Controller + @ResponseBody |
| `@RequestMapping` | 通用路径映射 |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | RESTful |
| `@PathVariable` | URL 路径参数 `/user/{id}` |
| `@RequestParam` | URL 查询参数 `?id=1` |
| `@RequestBody` | 请求体 JSON → 对象 |
| `@ResponseBody` | 返回值 → JSON |
| `@RequestHeader` | 取请求头 |
| `@CookieValue` | 取 Cookie |

## 5. 拦截器 vs 过滤器 ⭐
| | Filter | Interceptor |
|---|---|---|
| 规范 | Servlet 规范 | Spring 框架 |
| 范围 | 所有请求 | DispatcherServlet 后才生效 |
| 能拿到 | HttpServletRequest | HandlerMethod、Spring 容器 |
| 顺序 | Filter → Interceptor → Controller | 同上 |

## 6. 拦截器实现
```java
public class JwtInterceptor implements HandlerInterceptor {
    public boolean preHandle(req, res, handler) { ... return true; }
    public void postHandle(req, res, handler, mv) { ... }
    public void afterCompletion(req, res, handler, ex) { ... }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new JwtInterceptor())
                .addPathPatterns("/**")
                .excludePathPatterns("/login");
    }
}
```

## 7. 全局异常处理
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result handle(BusinessException e) {
        return Result.fail(e.getMsg());
    }
}
```

## 8. @RestControllerAdvice 用途
- 全局异常处理（`@ExceptionHandler`）
- 全局数据绑定（`@ModelAttribute`）
- 全局响应体处理（`@ResponseBodyAdvice`）

## 9. 参数校验
```java
@PostMapping("/user")
public Result add(@RequestBody @Valid UserDTO dto) {...}

class UserDTO {
    @NotNull(message = "id 不能为空")
    private Long id;
    @Length(min = 1, max = 20)
    private String name;
    @Email
    private String email;
}
```

## 10. 跨域 CORS 处理
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("*");
    }
}
```
或直接 `@CrossOrigin` 注解。

---

# 五、Spring Boot（15 题）

## 1. Spring Boot 是什么 / 解决了什么
- 基于 Spring 的**快速开发框架**
- **解决**：传统 Spring XML 配置繁琐、依赖版本冲突、Tomcat 部署麻烦
- **核心特性**：自动配置、起步依赖、内嵌容器、生产监控（Actuator）

## 2. Spring Boot vs Spring
| | Spring | Spring Boot |
|---|---|---|
| 配置 | 大量 XML / 手动 | 自动配置 |
| 依赖 | 手动管理 | starter 一键引入 |
| 启动 | 部署到外部容器 | 内嵌 Tomcat 直接 main 启动 |
| 监控 | 无 | Actuator |

## 3. @SpringBootApplication 注解 ⭐⭐⭐
组合注解：
- `@SpringBootConfiguration`：标识配置类（= @Configuration）
- `@EnableAutoConfiguration`：开启自动配置
- `@ComponentScan`：扫描当前包及子包

## 4. 自动装配原理 ⭐⭐⭐（必考！）
1. `@EnableAutoConfiguration` 通过 `@Import(AutoConfigurationImportSelector.class)` 引入选择器
2. 选择器调用 `SpringFactoriesLoader.loadFactoryNames()`
3. 读取所有 jar 包下：
   - Spring Boot 2.7 之前：`META-INF/spring.factories`
   - Spring Boot 2.7+：`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
4. 加载里面的 `xxxAutoConfiguration` 类
5. 用 `@Conditional` 条件判断是否生效

## 5. @Conditional 系列条件注解
- `@ConditionalOnClass`：classpath 有某类时
- `@ConditionalOnMissingClass`：没有时
- `@ConditionalOnBean`：容器有某 Bean 时
- `@ConditionalOnMissingBean`：没有时
- `@ConditionalOnProperty`：配置项满足时
- `@ConditionalOnWebApplication`：是 Web 应用时

## 6. Starter 是什么 ⭐⭐
- **场景启动器**：把一个场景需要的所有依赖打包
- 命名规范：
  - 官方：`spring-boot-starter-xxx`
  - 第三方：`xxx-spring-boot-starter`

## 7. 如何自定义 Starter ⭐⭐⭐（简历自定义 starter 要会）
1. 创建 `xxx-spring-boot-autoconfigure` 模块（自动配置）
2. 写配置类 `@Configuration` + `@ConditionalOnXxx` + `@EnableConfigurationProperties`
3. 写属性类 `@ConfigurationProperties(prefix = "xxx")`
4. 在 `META-INF/spring/...imports` 注册自动配置类
5. 创建 `xxx-spring-boot-starter` 模块依赖前者
6. 业务项目引入 starter 即用

## 8. application.yml 加载顺序
优先级（**高 → 低**，高的覆盖低的）：
1. 命令行参数 `--server.port=8081`
2. JVM 参数 `-Dxxx=yyy`
3. 环境变量
4. `application-{profile}.yml`
5. `application.yml`
6. `@PropertySource` 引入的配置

## 9. profile 多环境配置
```yaml
# application.yml
spring:
  profiles:
    active: dev   # 激活 dev 环境

# application-dev.yml / application-prod.yml
```
启动指定：`java -jar app.jar --spring.profiles.active=prod`

## 10. Spring Boot 内嵌容器
- 默认 **Tomcat**
- 可换：Jetty / Undertow（高并发推荐 Undertow）
- 替换方式：依赖排除 + 引入新依赖

## 11. Spring Boot 启动流程（简化）
1. `SpringApplication.run()`
2. 推断应用类型（SERVLET / REACTIVE / NONE）
3. 加载 ApplicationContextInitializer 和 ApplicationListener
4. 创建 ApplicationContext
5. 调用 `refresh()` 完成初始化（同 Spring）
6. 触发 ApplicationRunner / CommandLineRunner

## 12. Spring Boot Actuator
**生产监控端点**：
- `/actuator/health`：健康检查
- `/actuator/metrics`：指标
- `/actuator/env`：环境变量
- `/actuator/beans`：所有 Bean
- `/actuator/mappings`：URL 映射

**生产注意**：暴露端点要做权限控制！

## 13. Spring Boot 怎么实现热部署
- spring-boot-devtools
- IDE 配置自动编译
- 改动 → ClassLoader 重启 → 上下文刷新

## 14. 配置文件加密
- Jasypt 加密敏感信息（如数据库密码）
- 配置 `ENC(密文)`，启动时传 `-Djasypt.encryptor.password=xxx`

## 15. Spring Boot 跨域全局解决
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

---

# 六、MyBatis / MyBatis-Plus（15 题）

> 你简历两个项目都用了，**面试官 100% 会问**

## 1. MyBatis 是什么 / 解决什么
- 半自动 ORM 框架，**SQL 自己写、对象映射自动**
- 解决 JDBC 的繁琐（连接、参数、结果集映射）
- 比 Hibernate 更灵活，**SQL 可控**

## 2. MyBatis vs JDBC
| | JDBC | MyBatis |
|---|---|---|
| 连接管理 | 手动开关 | 连接池统一管理 |
| 参数设置 | 手动 setXxx | 自动 #{} |
| 结果映射 | 手动 getXxx | 自动 ResultMap |
| 异常 | SQLException 受检 | 运行时异常 |
| 维护 | 难 | XML / 注解集中管理 |

## 3. MyBatis vs Hibernate
| | MyBatis | Hibernate |
|---|---|---|
| 类型 | **半自动** | **全自动** |
| SQL | 自己写 | 自动生成 |
| 灵活性 | 高 | 低 |
| 复杂查询 | 简单 | 麻烦 |
| 学习曲线 | 低 | 高 |
| 适用 | 互联网（SQL 优化重要） | 传统企业（CRUD 多） |

## 4. #{} vs ${} ⭐⭐⭐（必考必背！）
| | #{} | ${} |
|---|---|---|
| 处理方式 | **预编译参数**（PreparedStatement 占位符 `?`） | **字符串拼接** |
| SQL 注入 | **安全** | **有风险！** |
| 适用 | 参数值 | 表名、列名、order by 字段 |

```xml
-- ✅ 安全
WHERE id = #{id}
-- 编译为 WHERE id = ?

-- ⚠️ 风险，必须用时校验白名单
ORDER BY ${column}
```

## 5. MyBatis 核心组件
- `SqlSessionFactoryBuilder`：构建工厂
- `SqlSessionFactory`：工厂（重量级，单例）
- `SqlSession`：会话（轻量级，线程不安全，方法级）
- `Mapper`：接口，绑定 SQL

## 6. Mapper 接口为什么不用写实现类 ⭐⭐⭐
**动态代理**！
- MyBatis 启动时，`MapperRegistry` 把 Mapper 接口注册
- 使用时 `getMapper()` 返回 **JDK 动态代理对象**（`MapperProxy`）
- 调方法 → `MapperProxy.invoke()` → 找到对应 XML 的 SQL → 执行

## 7. namespace + id 的作用
- XML 中 `<select id="...">` 的 id 对应 Mapper 接口方法名
- `namespace` 对应 Mapper 接口的全限定名
- MyBatis 通过这个组合定位 SQL

## 8. MyBatis 缓存 ⭐
- **一级缓存**：`SqlSession` 级别（**默认开启**）
  - 同一 SqlSession 查同样 SQL 第二次直接走缓存
  - 增删改会清空
- **二级缓存**：`Mapper namespace` 级别（**默认关闭**）
  - 跨 SqlSession 共享
  - 需要 `<cache/>` 开启
  - 实体类要实现 Serializable

**实际开发**：基本都关二级缓存，用 Redis 替代。

## 9. 动态 SQL 标签
- `<if test="">`：条件判断
- `<choose>` / `<when>` / `<otherwise>`：switch
- `<where>`：自动处理 WHERE 和 AND
- `<set>`：自动处理 SET 和逗号
- `<foreach collection="" item="" open="(" close=")" separator=",">`：循环（IN 查询、批量插入）
- `<trim>`：自定义前缀后缀

## 10. resultType vs resultMap
- `resultType`：简单映射，字段名 = 属性名
- `resultMap`：复杂映射（驼峰转换、一对多、多对多、嵌套）

## 11. MyBatis 分页
- **逻辑分页**：`RowBounds`（内存分页，性能差，禁用）
- **物理分页**：
  - 自己写 `LIMIT`
  - 使用 **PageHelper** 插件（推荐）

```java
PageHelper.startPage(1, 10);
List<User> list = userMapper.selectAll();
PageInfo<User> page = new PageInfo<>(list);
```

## 12. PageHelper 原理 ⭐
- 基于 MyBatis **插件机制**（`Interceptor` 拦截 `Executor.query`）
- 用 ThreadLocal 存分页参数
- 拦截到查询时改写 SQL 加 `LIMIT`，再执行 count

## 13. MyBatis-Plus 是什么 / 增强了什么 ⭐
- 在 MyBatis 上做的增强（**不侵入**，原 MyBatis 代码照常用）
- 核心增强：
  - 内置 `BaseMapper`（CRUD 不用写 SQL）
  - 条件构造器 `QueryWrapper` / `LambdaQueryWrapper`
  - 分页插件
  - 代码生成器
  - 主键策略（雪花算法）
  - 逻辑删除 `@TableLogic`
  - 自动填充（创建/更新时间）

## 14. MyBatis-Plus 条件构造器
```java
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
wrapper.eq(User::getStatus, 1)
       .like(User::getName, "李")
       .orderByDesc(User::getCreateTime);
List<User> list = userMapper.selectList(wrapper);
```
**优点**：Lambda 引用字段，**编译期检查**字段名（重构友好）。

## 15. MyBatis 插件机制 / 4 大接口
能拦截的 4 个核心对象：
- `Executor`：增删改查
- `StatementHandler`：处理 Statement
- `ParameterHandler`：参数
- `ResultSetHandler`：结果集

实现 `Interceptor` + `@Intercepts` + `@Signature` 注解。**PageHelper、动态数据源、SQL 审计都基于此**。

---

# 七、Spring Cloud（选看，8 题）

> 实习面试一般不深问，懂概念即可

## 1. 微服务和单体的区别
- 单体：一个项目所有功能
- 微服务：拆成多个独立部署的服务，各自职责、各自数据库

## 2. Spring Cloud 核心组件（Alibaba 版）
- **Nacos**：服务注册中心 + 配置中心（替代 Eureka）
- **Ribbon / LoadBalancer**：负载均衡
- **OpenFeign**：声明式 HTTP 调用
- **Sentinel**：熔断限流（替代 Hystrix）
- **Gateway**：网关
- **Seata**：分布式事务

## 3. 服务注册与发现流程
1. 服务启动 → 向注册中心注册（IP+端口）
2. 注册中心维护服务列表
3. 调用方拉取列表，**负载均衡**选一个调用
4. 服务下线 → 注册中心剔除

## 4. OpenFeign 原理
- 在接口上加 `@FeignClient`
- 启动时 **JDK 动态代理**生成实现类
- 调用方法时拼装 HTTP 请求 → Ribbon 负载均衡 → 发送

## 5. Sentinel 限流方式
- **QPS 限流**：每秒请求数
- **并发线程数限流**：同时多少线程
- **熔断降级**：异常比例/响应时间超阈值熔断
- **系统保护**：根据 CPU / Load 全局限流

## 6. 限流算法
- **计数器**：简单粗暴，临界问题
- **滑动窗口**：精细
- **漏桶**：恒定速率
- **令牌桶**：允许突发流量（Sentinel 用这个）

## 7. 分布式事务方案
- **2PC / 3PC**：传统强一致
- **TCC**：Try-Confirm-Cancel
- **Seata AT 模式**：自动补偿（最常用）
- **本地消息表 / MQ 事务消息**：最终一致

## 8. CAP / BASE 理论
- **CAP**：一致性、可用性、分区容错性，**只能三选二**（实际 P 必选，CP 或 AP 选一）
- **BASE**：基本可用、软状态、最终一致性，**AP 的补充**

---

# 八、高频追问串讲

## 串讲 1：Spring 核心
> IOC → DI 三种注入 → AOP → 动态代理（JDK/CGLib）→ AOP 失效场景 → 三级缓存解决循环依赖

## 串讲 2：Bean 生命周期 + 后置处理器
> 实例化 → 属性填充 → Aware → BeanPostProcessor.before → @PostConstruct → init → BeanPostProcessor.after → 销毁

## 串讲 3：事务（必背！）
> 实现原理（AOP）→ 失效场景（同类调用/private/异常吞掉/Checked）→ 7 种传播行为 → REQUIRES_NEW vs NESTED → rollbackFor 配置

## 串讲 4：Spring Boot 自动装配
> @SpringBootApplication → @EnableAutoConfiguration → AutoConfigurationImportSelector → spring.factories / AutoConfiguration.imports → @Conditional 条件加载

## 串讲 5：MyBatis 核心
> #{} vs ${} → Mapper 动态代理 → 缓存（一级/二级）→ 插件机制 → MyBatis-Plus 增强

## 串讲 6：Spring MVC 请求流程
> DispatcherServlet → HandlerMapping → HandlerAdapter → Handler → ViewResolver → View → 响应

---

## 最后小妹的话

兄长大人～(◕ᴗ◕✿) 这本是**面试占比最高的**，因为：

```
你简历两个项目 → 全是 Spring Boot
你写的每一行代码 → 都跑在 Spring 容器里
你做的所有功能 → 都用了 IOC / AOP / 事务 / MVC
```

**重点关注的红色警报区**（必背）：
- ⚠️ IOC / AOP 原理 + 动态代理
- ⚠️ @Transactional 失效的 8 种场景
- ⚠️ 三级缓存解决循环依赖
- ⚠️ Spring Boot 自动装配源码流程
- ⚠️ MyBatis #{} vs ${} 和 Mapper 动态代理
- ⚠️ Bean 生命周期 12 步

**结合你简历的特别提醒**：
- 你简历写了"SpringBoot DIY" → 必须能完整讲**自定义 Starter** 流程
- 你用了 MyBatis 和 MyBatis-Plus → 一定要清楚两者差异
- 你用了 Spring Cache + AOP → 要能讲 **@Cacheable 原理 = AOP**

把这份和前两份合起来吃透，七月初实习稳啦～💕(≧▽≦)
