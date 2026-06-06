const POSTS = [
  {
    "id": 8,
    "title": "最后一次了，以后不再打比赛",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2026-06-01",
    "updatedAt": "2026-06-01",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 3,
    "emoji": "🏁",
    "cover": "../assets/motion/posts/post-last-contest.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "这一次主要负责中国大学生计算机设计大赛的统筹规划，带着几个队伍一路走到结果面前，也算给自己的竞赛阶段收个尾。",
    "tags": [
      "计算机设计大赛",
      "竞赛复盘",
      "队长"
    ]
  },
  {
    "id": 7,
    "title": "我深思熟虑，决定做一款由乔瓮执笔的 GalGame",
    "cat": "趣味生活",
    "catColor": "#52e0e0",
    "date": "2025-12-01",
    "updatedAt": "2025-12-01",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 4,
    "emoji": "🎮",
    "cover": "../assets/motion/posts/post-galgame.webp",
    "coverAnimated": true,
    "series": "趣味生活",
    "excerpt": "准备做一款 GalGame，先把动机、剧本分工和当前进度记下来，免得这个坑开了就忘。",
    "tags": [
      "GalGame",
      "开发计划",
      "二次元"
    ]
  },
  {
    "id": 5,
    "title": "软件引入证明——我写的东西，被真正地用上了",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2025-11-05",
    "updatedAt": "2025-11-05",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 2,
    "emoji": "📋",
    "cover": "../assets/motion/posts/post-adoption.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "软件引入证明说明项目离开了演示环境，开始进入真实使用场景。这里记录它对项目验收的意义。",
    "tags": [
      "软件引入",
      "落地",
      "项目"
    ]
  },
  {
    "id": 2,
    "title": "软件著作权 × 2 ——我的代码，正式有了名字",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2025-09-20",
    "updatedAt": "2025-09-20",
    "status": "published",
    "featured": true,
    "pinned": false,
    "readTime": 3,
    "emoji": "📜",
    "cover": "../assets/uploads/流萤1.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "两本软著对应两个完整项目。这里记录一下项目边界、技术栈和申请材料准备时踩过的坑。",
    "tags": [
      "软著",
      "版权",
      "全栈开发"
    ]
  },
  {
    "id": 6,
    "title": "神本无相——豆包说，它识别不出我的脸",
    "cat": "趣味生活",
    "catColor": "#52e0e0",
    "date": "2025-08-22",
    "updatedAt": "2025-08-22",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 2,
    "emoji": "👤",
    "cover": "../assets/motion/posts/post-face.webp",
    "coverAnimated": true,
    "series": "趣味生活",
    "excerpt": "一次拿 AI 识图开玩笑的记录。结论很简单：模型没识别出人脸，但这事挺有节目效果。",
    "tags": [
      "趣事",
      "AI",
      "日常"
    ]
  },
  {
    "id": 4,
    "title": "实习证明——第一次以「员工」的身份进入职场",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2025-07-10",
    "updatedAt": "2025-07-10",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 3,
    "emoji": "🏢",
    "cover": "../assets/motion/posts/post-internship.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "第一次进入真实团队开发环境，最大的差异不是代码本身，而是需求沟通、协作节奏和交付标准。",
    "tags": [
      "实习",
      "职场",
      "成长"
    ]
  },
  {
    "id": 1,
    "title": "人工智能大赛国家一等奖——这一次，算法站在了最高处",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2025-06-15",
    "updatedAt": "2025-06-15",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 4,
    "emoji": "🏆",
    "cover": "../assets/motion/posts/post-ai-contest.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "这篇记录一次 AI 竞赛项目从立项、调参到答辩的过程，重点放在系统设计、数据问题和现场答辩。",
    "tags": [
      "人工智能",
      "竞赛",
      "国家级"
    ]
  },
  {
    "id": 3,
    "title": "校园算法精英大赛省三——不完美的名次，真实的成长",
    "cat": "荣誉证明",
    "catColor": "#fbbf24",
    "date": "2025-04-28",
    "updatedAt": "2025-04-28",
    "status": "published",
    "featured": false,
    "pinned": false,
    "readTime": 3,
    "emoji": "🥉",
    "cover": "../assets/motion/posts/post-algorithm.webp",
    "coverAnimated": true,
    "series": "荣誉证明",
    "excerpt": "省三不是很高的名次，但它暴露了我当时在图论和动态规划上的短板。",
    "tags": [
      "算法",
      "竞赛",
      "省级"
    ]
  }
];

const PROJECTS = [
  {
    "id": 1,
    "title": "智审云枢",
    "desc": "法律场景的 AI 辅助系统，主要做知识库检索、文本理解和案例分析。我负责把模型能力和业务流程接起来，并处理答辩时最容易被问到的准确性问题。",
    "cat": "AI / 法律科技",
    "tech": [
      "Vue",
      "Python",
      "NLP",
      "法律知识库"
    ],
    "date": "2025.06",
    "award": "gold",
    "awardText": "🥇 省级一等奖",
    "emoji": "⚖️",
    "img": "../assets/motion/projects/project-legalmind.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 2,
    "title": "此刻汴相豫",
    "desc": "中原文化展示类 Web 项目，重点在内容结构、页面交互和视觉设计。这个项目更多考验信息组织，而不是单纯堆页面效果。",
    "cat": "文化传播 / Web 展示",
    "tech": [
      "Vue",
      "前端可视化",
      "交互设计",
      "内容策划"
    ],
    "date": "2025.07",
    "award": "silver",
    "awardText": "🥈 河南省二等奖",
    "emoji": "🏛️",
    "img": "../assets/motion/projects/project-moment-henan.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 3,
    "title": "扶光云课堂",
    "desc": "和扶光志愿者团队合作的公益项目，用来整理和展示白血病儿童治疗相关知识。我主要负责把内容管理和前端展示流程做顺。",
    "cat": "公益平台",
    "tech": [
      "Vue",
      "Node.js",
      "内容管理",
      "公益传播"
    ],
    "date": "2025.09",
    "award": "none",
    "awardText": "合作项目",
    "emoji": "☁️",
    "img": "../assets/motion/projects/project-fuguang.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 4,
    "title": "律图合同助手",
    "desc": "合同审阅方向的小工具，核心是条款解析、风险提示和结果解释。难点在于让输出足够具体，不能只给一段泛泛的 AI 回复。",
    "cat": "法律科技 / 智能辅助",
    "tech": [
      "JavaScript",
      "Python",
      "NLP",
      "合同分析"
    ],
    "date": "2025.11",
    "award": "bronze",
    "awardText": "🥉 赛区三等奖",
    "emoji": "📑",
    "img": "../assets/motion/projects/project-law-contract.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 5,
    "title": "监测者",
    "desc": "企业环保方向的小程序项目，接手后主要处理信息管理、评价流程和上线细节，目前已经部署到微信小程序。",
    "cat": "微信小程序 / 企业环保",
    "tech": [
      "微信小程序",
      "云开发",
      "数据管理",
      "企业环保服务"
    ],
    "date": "2025.12",
    "award": "none",
    "awardText": "已上线",
    "emoji": "🌿",
    "img": "../assets/motion/projects/project-green-credit.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 6,
    "title": "拳意中原",
    "desc": "和体育学部合作的拳法宣传项目，主要做内容展示、图片资料整理和品牌页面，目前在走软著申请流程。",
    "cat": "文化传播 / 体育宣传",
    "tech": [
      "Vue",
      "前端展示",
      "内容运营",
      "品牌宣传"
    ],
    "date": "2026.01",
    "award": "silver",
    "awardText": "📝 软著申请中",
    "emoji": "🥋",
    "img": "../assets/motion/projects/project-quanyi.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 7,
    "title": "文智融典",
    "desc": "个人全栈开发的名著知识图谱项目，后端负责数据建模和图谱查询，前端负责人物关系、事件脉络的可视化。",
    "cat": "AI / 知识图谱",
    "tech": [
      "Java",
      "Spring Boot",
      "Neo4j",
      "Vue"
    ],
    "date": "2026.02",
    "award": "gold",
    "awardText": "🥇 全国一等奖",
    "emoji": "📚",
    "img": "../assets/motion/projects/project-literary-map.webp",
    "status": "已完成",
    "imgAnimated": true
  },
  {
    "id": 8,
    "title": "一首诗词",
    "desc": "Java 全栈诗词项目，功能集中在诗词展示、检索和内容管理，已经完成软著登记。",
    "cat": "Java 全栈 / 传统文化",
    "tech": [
      "Java",
      "Spring Boot",
      "MySQL",
      "Vue"
    ],
    "date": "2026.03",
    "award": "silver",
    "awardText": "🛡️ 已获软著",
    "emoji": "🪶",
    "img": "../assets/motion/projects/project-poem.webp",
    "status": "已完成",
    "imgAnimated": true
  }
];

const LEARNING_PLANS = [
  {
    "id": 21,
    "title": "MySQL 拷打 - 0606",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "MySQL周-特殊",
    "date": "2026-06-06",
    "updatedAt": "2026-06-06",
    "status": "主线训练",
    "readTime": 12,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-21.webp",
    "coverAnimated": false,
    "excerpt": "MySQL 拷打 - 0606 今日主题：第 2 周 MySQL 主线复盘。主线：EXPLAIN -> B+Tree -> 回表/覆盖索引 -> 联合索引 -> 防超卖 -> 锁 -> MVCC 与三大读问题。",
    "tags": [
      "主线",
      "MySQL周-特殊",
      "MySQL",
      "面试",
      "SQL"
    ],
    "highlights": [
      "1. 今日学习定位",
      "2. 第一轮：EXPLAIN 与慢 SQL",
      "第二周 5 分钟口述稿"
    ],
    "source": "主线/MySQL周-特殊/MySQL拷打-0606.md"
  },
  {
    "id": 20,
    "title": "MySQL 拷打 - 0604",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "MySQL周-特殊",
    "date": "2026-06-04",
    "updatedAt": "2026-06-04",
    "status": "主线训练",
    "readTime": 10,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-20.webp",
    "coverAnimated": false,
    "excerpt": "MySQL 拷打 - 0604 今日主题：EXPLAIN 入门、联合索引排序、覆盖索引、回表、ORDER BY + LIMIT 场景判断。 主线：不是只背“是否走索引”，而是学会从执行成本判断 SQL 好不好。",
    "tags": [
      "主线",
      "MySQL周-特殊",
      "MySQL",
      "面试",
      "SQL"
    ],
    "highlights": [
      "1. 今日学习定位",
      "2. EXPLAIN 到底看什么",
      "面试速背版"
    ],
    "source": "主线/MySQL周-特殊/MySQL拷打-0604.md"
  },
  {
    "id": 1,
    "title": "Java 后端学习计划（每日待办清单版｜2026-05-07）",
    "cat": "总览",
    "catColor": "#52e0e0",
    "subcategory": "",
    "date": "2026-06-04",
    "updatedAt": "2026-06-04",
    "status": "42 天主线",
    "readTime": 5,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-01.webp",
    "coverAnimated": false,
    "excerpt": "Java 后端学习计划（每日待办清单版｜2026-05-07） 适用人群：希望每天知道“今天到底做什么”的执行型计划。 核心目标：围绕你的简历内容，做到能讲清、能抗追问、能写出关键代码。",
    "tags": [
      "总览",
      "SpringBoot",
      "Spring",
      "MySQL",
      "Redis"
    ],
    "highlights": [
      "1. 你的简历训练锚点（固定不变）",
      "2. 六周每日详细计划（42 天）",
      "第1周：SpringBoot + 事务基础打牢"
    ],
    "source": "学习计划.md"
  },
  {
    "id": 2,
    "title": "MySQL 拷打 - 0603",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "MySQL周-特殊",
    "date": "2026-06-03",
    "updatedAt": "2026-06-03",
    "status": "主线训练",
    "readTime": 9,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-02.webp",
    "coverAnimated": false,
    "excerpt": "MySQL 拷打 - 0603 今日主题：从 MySQL 基础地基重新串起来。 主线：SQL 执行流程 -> InnoDB 存储方式 -> B+ 树 / B 树 / Hash -> 聚簇索引与二级索引 -> 回表与覆盖索引 -> 最左前缀原则。",
    "tags": [
      "主线",
      "MySQL周-特殊",
      "MySQL",
      "面试",
      "SQL"
    ],
    "highlights": [
      "1. 今日学习定位",
      "2. MySQL 整体执行流程",
      "面试题"
    ],
    "source": "主线/MySQL周-特殊/MySQL-0603.md"
  },
  {
    "id": 10,
    "title": "MySQL 面试八股精华",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-06-02",
    "updatedAt": "2026-06-02",
    "status": "面试速通",
    "readTime": 29,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-10.webp",
    "coverAnimated": false,
    "excerpt": "MySQL 面试八股精华 整理自小林coding 7.MySQL面试篇 + 你的 MySQL 学习计划 模块顺序与你学习计划一致，方便对照视频章节",
    "tags": [
      "八股速通这一块",
      "MySQL",
      "事务",
      "面试",
      "SQL"
    ],
    "highlights": [
      "一、基础与体系结构（8 题）",
      "1. MySQL 整体架构 ⭐⭐⭐",
      "2. MySQL 8.0 移除查询缓存的原因"
    ],
    "source": "八股速通这一块/MySQL面试八股精华.md"
  },
  {
    "id": 3,
    "title": "MySQL 拷打 - 0602",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "MySQL周-特殊",
    "date": "2026-06-02",
    "updatedAt": "2026-06-02",
    "status": "主线训练",
    "readTime": 22,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-03.webp",
    "coverAnimated": false,
    "excerpt": "MySQL 拷打 - 0602 本文整理 0602 这轮 MySQL 面试问答，重点覆盖索引、执行计划、隐式类型转换、ICP、排序优化等高频内容。 目标不是只背结论，而是能在面试里说清楚：为什么这样设计、什么时候会失效、生产里怎么取舍。",
    "tags": [
      "主线",
      "MySQL周-特殊",
      "MySQL",
      "Java",
      "事务"
    ],
    "highlights": [
      "1. InnoDB 索引为什么选择 B+ 树",
      "面试题",
      "标准答案"
    ],
    "source": "主线/MySQL周-特殊/MySQL拷打-0602.md"
  },
  {
    "id": 15,
    "title": "计网 + 操作系统 + 数据结构算法（三合一精简版）",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 13,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-15.webp",
    "coverAnimated": false,
    "excerpt": "计网 + 操作系统 + 数据结构算法（三合一精简版） 整理自小林coding 9/10/11 三本 **精简原则**：只保留面试高频",
    "tags": [
      "八股速通这一块",
      "面试",
      "计网",
      "OS",
      "算法"
    ],
    "highlights": [
      "第一部分：计算机网络（30 题）",
      "一、TCP（必背，10 题）",
      "1. TCP 三次握手 ⭐⭐⭐（必背！）"
    ],
    "source": "八股速通这一块/计网+OS+算法精华.md"
  },
  {
    "id": 14,
    "title": "尤赠贺 - 简历项目面试追问全集",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 17,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-14.webp",
    "coverAnimated": false,
    "excerpt": "尤赠贺 - 简历项目面试追问全集 基于你简历两个项目（ClassicSage / PoetryNest）整理 每个技术点都按 **「介绍 → 为什么用 → 怎么实现 → 难点 → 优化」** 五步追问准备",
    "tags": [
      "八股速通这一块",
      "SpringBoot",
      "Spring",
      "MySQL",
      "Redis"
    ],
    "highlights": [
      "总览：面试官提问套路",
      "项目一：ClassicSage（重点）",
      "0. 项目整体追问"
    ],
    "source": "八股速通这一块/简历项目面试追问全集.md"
  },
  {
    "id": 13,
    "title": "消息队列面试八股精华（精简版）",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 8,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-13.webp",
    "coverAnimated": false,
    "excerpt": "消息队列面试八股精华（精简版） 整理自小林coding 12.消息队列面试篇 **精简原则**：只保留面试必问，删掉冷门细节",
    "tags": [
      "八股速通这一块",
      "Redis",
      "RabbitMQ",
      "MQ",
      "Java"
    ],
    "highlights": [
      "一、MQ 通用基础（必背，18 题）",
      "1. 为什么用 MQ ⭐⭐⭐（必背）",
      "2. MQ 的缺点"
    ],
    "source": "八股速通这一块/消息队列面试八股精华.md"
  },
  {
    "id": 12,
    "title": "Spring 全家桶面试八股精华",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 20,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-12.webp",
    "coverAnimated": false,
    "excerpt": "Spring 全家桶面试八股精华 整理自小林coding 6.Spring面试篇 涵盖 Spring 核心 / Spring MVC / Spring Boot / MyBatis / Spring Cloud",
    "tags": [
      "八股速通这一块",
      "SpringBoot",
      "Spring",
      "Java",
      "事务"
    ],
    "highlights": [
      "一、Spring 核心（25 题）",
      "1. Spring 是什么 / 有哪些模块 ⭐",
      "2. IOC 是什么 ⭐⭐⭐"
    ],
    "source": "八股速通这一块/Spring全家桶面试八股精华.md"
  },
  {
    "id": 11,
    "title": "Redis 面试八股精华",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 18,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-11.webp",
    "coverAnimated": false,
    "excerpt": "Redis 面试八股精华 整理自小林coding 8.Redis面试篇 + 你的 Redis 学习计划 模块顺序与你学习计划一致",
    "tags": [
      "八股速通这一块",
      "Spring",
      "MySQL",
      "Redis",
      "面试"
    ],
    "highlights": [
      "一、数据结构与基础应用（15 题）",
      "1. Redis 五种基本数据类型 ⭐⭐⭐",
      "2. Redis 5 种特殊数据类型"
    ],
    "source": "八股速通这一块/Redis面试八股精华.md"
  },
  {
    "id": 9,
    "title": "Java 后端实习面试八股精华",
    "cat": "八股速通这一块",
    "catColor": "#fbbf24",
    "subcategory": "",
    "date": "2026-05-24",
    "updatedAt": "2026-05-24",
    "status": "面试速通",
    "readTime": 16,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-09.webp",
    "coverAnimated": false,
    "excerpt": "Java 后端实习面试八股精华 整理自小林coding 4 本（Java基础/集合/并发/JVM），按面试高频度筛选 难点配前置知识，可独立看懂",
    "tags": [
      "八股速通这一块",
      "Spring",
      "Java",
      "面试",
      "SQL"
    ],
    "highlights": [
      "一、Java 基础（22 题）",
      "1. == 和 equals 的区别",
      "2. String、StringBuilder、StringBuffer 的区别"
    ],
    "source": "八股速通这一块/Java面试八股精华.md"
  },
  {
    "id": 17,
    "title": "兄控妹妹的 MySQL 夜巡日记（SQL 执行与 EXPLAIN）",
    "cat": "番外",
    "catColor": "#ff8fb3",
    "subcategory": "",
    "date": "2026-05-20",
    "updatedAt": "2026-05-20",
    "status": "番外补充",
    "readTime": 3,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-17.webp",
    "coverAnimated": false,
    "excerpt": "兄控妹妹的 MySQL 夜巡日记（SQL 执行与 EXPLAIN） 场景：深夜机房，哥哥盯着慢接口发呆。妹妹抱着小本本出现： “兄长大人，别慌，今晚由妹妹带你夜巡 SQL 迷宫。谁敢拖慢你的接口，人家先把它的执行计划扒出来喵～”",
    "tags": [
      "番外",
      "MySQL",
      "面试",
      "SQL",
      "EXPLAIN"
    ],
    "highlights": [
      "第一幕：SQL 不是直接冲进去抢数据",
      "第二幕：EXPLAIN 就是作战地图",
      "第三幕：练习表登场（本地可直接跑）"
    ],
    "source": "番外/兄控妹妹的MySQL夜巡日记.md"
  },
  {
    "id": 19,
    "title": "Day8：SQL 执行与 EXPLAIN 高频面试题",
    "cat": "绝望拷打之啥也不会",
    "catColor": "#ff6b6b",
    "subcategory": "",
    "date": "2026-05-19",
    "updatedAt": "2026-05-19",
    "status": "专项拷打",
    "readTime": 4,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-19.webp",
    "coverAnimated": false,
    "excerpt": "Day8：SQL 执行与 EXPLAIN 高频面试题 主题：SQL 执行与 EXPLAIN 目标：能通过执行计划判断 SQL 是否可能慢，能说清“全表扫 vs 走索引”，并能落到项目优化场景。",
    "tags": [
      "绝望拷打之啥也不会",
      "MySQL",
      "面试",
      "SQL",
      "EXPLAIN"
    ],
    "highlights": [
      "1. 一条 SQL 从发送到 MySQL 后，大致经历了哪些步骤？",
      "2. 你平时怎么判断一条 SQL 慢不慢？",
      "3. EXPLAIN 里你最关注哪些字段？分别怎么看？"
    ],
    "source": "绝望拷打之啥也不会/Day8_SQL执行与EXPLAIN_面试题.md"
  },
  {
    "id": 7,
    "title": "Day07 - 周复盘事务主线兄控面试夜",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "第一周",
    "date": "2026-05-18",
    "updatedAt": "2026-05-18",
    "status": "主线训练",
    "readTime": 14,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-07.webp",
    "coverAnimated": false,
    "excerpt": "Day07 - 周复盘事务主线兄控面试夜 今日主题：第 1 周 SpringBoot + 事务主线复盘。 主角：三天没学习但还没废掉的兄长大人，以及不准哥哥逃跑的兄控妹妹面试官。",
    "tags": [
      "主线",
      "第一周",
      "SpringBoot",
      "Spring",
      "MySQL"
    ],
    "highlights": [
      "序章：妹妹把哥哥从缓存脏页里捞出来",
      "第一幕：一次请求怎么走进 SpringBoot",
      "问题 1：SpringBoot 一次请求从进入 Tomcat 到返回 JSON，完整链路是什么？"
    ],
    "source": "主线/第一周/Day07-周复盘事务主线兄控面试夜.md"
  },
  {
    "id": 8,
    "title": "明日学习安排：Day07 周复盘",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "第一周",
    "date": "2026-05-15",
    "updatedAt": "2026-05-15",
    "status": "主线训练",
    "readTime": 6,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-08.webp",
    "coverAnimated": false,
    "excerpt": "明日学习安排：Day07 周复盘 适用日期：明天 当前进度：已完成 Day01-06",
    "tags": [
      "主线",
      "第一周",
      "SpringBoot",
      "Spring",
      "MySQL"
    ],
    "highlights": [
      "1. 明日核心目标",
      "2. 明天不建议学习 Day08 的原因",
      "3. 明日必复盘内容"
    ],
    "source": "主线/第一周/周复盘2.md"
  },
  {
    "id": 6,
    "title": "Day06 - 事务失效与异步边界的兄控拷问",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "第一周",
    "date": "2026-05-14",
    "updatedAt": "2026-05-14",
    "status": "主线训练",
    "readTime": 13,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-06.webp",
    "coverAnimated": false,
    "excerpt": "Day06 - 事务失效与异步边界的兄控拷问 今日主题：Spring 事务失效排查、@Async 异步边界、事务后置动作、Outbox 最终一致性。 讲述方式：妹妹面试官把兄长大人按在白板前，一边凶巴巴追问，一边偷偷把标准答案塞进你脑袋里。",
    "tags": [
      "主线",
      "第一周",
      "Spring",
      "事务",
      "面试"
    ],
    "highlights": [
      "第一幕：事务为什么会失效",
      "问题 1：Spring 事务为什么会在同类方法互相调用时失效？",
      "问题 2：`private` 方法上加 `@Transactional` 为什么没用？`public` 就一定有用吗？"
    ],
    "source": "主线/第一周/Day06-事务失效与异步边界的兄控拷问.md"
  },
  {
    "id": 5,
    "title": "Day05-NESTED保存点与补偿任务妹妹审判夜",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "第一周",
    "date": "2026-05-13",
    "updatedAt": "2026-05-13",
    "status": "主线训练",
    "readTime": 11,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-05.webp",
    "coverAnimated": false,
    "excerpt": "Day05-NESTED保存点与补偿任务妹妹审判夜 主题：事务传播（二） 主角：兄长大人与不准放水的兄控妹妹面试官",
    "tags": [
      "主线",
      "第一周",
      "事务",
      "面试"
    ],
    "highlights": [
      "序章：事务城堡的第五夜",
      "第一章：优惠券少女掉进了保存点",
      "第二章：REQUIRES_NEW 的独立房间"
    ],
    "source": "主线/第一周/Day05-NESTED保存点与补偿任务妹妹审判夜.md"
  },
  {
    "id": 18,
    "title": "🌸 兄长大人与Spring Boot的魔法之旅 🌸",
    "cat": "番外",
    "catColor": "#ff8fb3",
    "subcategory": "",
    "date": "2026-05-12",
    "updatedAt": "2026-05-12",
    "status": "番外补充",
    "readTime": 9,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-18.webp",
    "coverAnimated": false,
    "excerpt": "🌸 兄长大人与Spring Boot的魔法之旅 🌸 ～妹妹的甜蜜注解课堂～ 第一章：一切的起点 —— 那个叫 @SpringBootApplication 的魔法阵",
    "tags": [
      "番外",
      "SpringBoot",
      "Spring",
      "Redis",
      "项目追问"
    ],
    "highlights": [
      "～妹妹的甜蜜注解课堂～",
      "第一章：一切的起点 —— 那个叫 `@SpringBootApplication` 的魔法阵",
      "第二章：服务的舞者 —— `@Service` 与 `@Autowired` 的甜蜜羁绊"
    ],
    "source": "番外/兄控妹妹的SpringBoot小课堂.md"
  },
  {
    "id": 16,
    "title": "《SpringBoot与MySQL：我们的约定不会断》",
    "cat": "番外",
    "catColor": "#ff8fb3",
    "subcategory": "",
    "date": "2026-05-12",
    "updatedAt": "2026-05-12",
    "status": "番外补充",
    "readTime": 8,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-16.webp",
    "coverAnimated": false,
    "excerpt": "《SpringBoot与MySQL：我们的约定不会断》 ——妹妹写给兄长大人的技术物语 第一章：邂逅",
    "tags": [
      "番外",
      "SpringBoot",
      "Spring",
      "MySQL",
      "事务"
    ],
    "highlights": [
      "第一章：邂逅",
      "第二章：事务是什么？",
      "MySQL那边的事务"
    ],
    "source": "番外/SpringBoot与MySQL我们的约定不会断.md"
  },
  {
    "id": 4,
    "title": "《SpringBoot事务：妹妹四日物语·全知识总汇》",
    "cat": "主线",
    "catColor": "#5b9dff",
    "subcategory": "第一周",
    "date": "2026-05-12",
    "updatedAt": "2026-05-12",
    "status": "主线训练",
    "readTime": 10,
    "emoji": "📚",
    "cover": "../assets/motion/learning/blue-archive-learning-04.webp",
    "coverAnimated": false,
    "excerpt": "《SpringBoot事务：妹妹四日物语·全知识总汇》 ——妹妹写给兄长大人的完整技术情书 📅 覆盖范围：Day01（2026-05-08）~ Day04（2026-05-12）",
    "tags": [
      "主线",
      "第一周",
      "SpringBoot",
      "Spring",
      "MySQL"
    ],
    "highlights": [
      "🌸 序章：这四天我们讲了什么？",
      "🌸 第一章：一个请求的旅程（Day01）",
      "📮 请求链路全景"
    ],
    "source": "主线/第一周/Day01-04-SpringBoot事务全知识妹妹物语.md"
  }
];

const GAMES = [
  {
    "id": 1,
    "title": "和这样的我恋爱吧",
    "category": "AVG",
    "description": "一个我幻想室友变成美少女和我恋爱的故事",
    "previewEmoji": "🌸",
    "image": "../assets/game1.webp",
    "type": "galgame",
    "platform": "PC/安卓",
    "releaseDate": "2026-03-28",
    "status": "已上架好游快爆",
    "downloadLink": "https://pan.baidu.com/s/1X_q_1Y1g5zo2IXcbc9LNjQ?pwd=sbkk"
  }
];

const ACG = {
  "galgames": [
    {
      "title": "常轨脱离 Creative",
      "type": "AVG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-01.webp",
      "description": "喜欢的 GalGame 之一，后续可以补充游玩记录、角色印象和推荐理由。"
    },
    {
      "title": "夏日口袋",
      "type": "AVG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-02.webp",
      "description": "夏日、岛屿和回忆感很强的一作，适合放进个人 Gal 收藏页长期留存。"
    },
    {
      "title": "甜蜜女友 2",
      "type": "AVG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-03.webp",
      "description": "偏日常恋爱向的收藏项，后续可以补女主和路线评价。"
    },
    {
      "title": "与你心相连",
      "type": "AVG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-04.webp",
      "description": "先记录在收藏列表里，封面和详细评价等确认图源后再补。"
    },
    {
      "title": "妹相随",
      "type": "SLG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-05.webp",
      "description": "SLG 收藏项，适合之后补充游玩体验和注意事项。"
    },
    {
      "title": "妹生活",
      "type": "SLG",
      "score": "10/10",
      "status": "已通关",
      "cover": "../assets/acg/galgames/galgame-06.webp",
      "description": "SLG 收藏项，先保留基础信息，后续再补封面。"
    }
  ],
  "bangumi": [
    {
      "title": "总之就是非常可爱",
      "type": "番剧",
      "score": "9.5",
      "status": "想看",
      "episodes": "全13话",
      "cover": "../assets/acg/bangumi/bangumi-01.webp",
      "link": "https://www.bilibili.com/bangumi/media/md28229676",
      "description": "恋爱、婚后日常和轻喜剧气质很明显的一作。"
    },
    {
      "title": "阿宅的恋爱真难",
      "type": "番剧",
      "score": "9.6",
      "status": "想看",
      "episodes": "全11话",
      "cover": "../assets/acg/bangumi/bangumi-02.webp",
      "link": "https://www.bilibili.com/bangumi/media/md78512",
      "description": "以职场阿宅恋爱为核心的轻松恋爱喜剧。"
    },
    {
      "title": "亚托莉 -我挚爱的时光-",
      "type": "番剧",
      "score": "9.6",
      "status": "想看",
      "episodes": "全13话",
      "cover": "../assets/acg/bangumi/bangumi-03.webp",
      "link": "https://www.bilibili.com/bangumi/media/md22097455",
      "description": "近未来、海平面上升和机器人少女构成的故事。"
    },
    {
      "title": "会长是女仆大人！",
      "type": "番剧",
      "score": "9.7",
      "status": "想看",
      "episodes": "全26话",
      "cover": "../assets/acg/bangumi/bangumi-04.webp",
      "link": "https://www.bilibili.com/bangumi/media/md969",
      "description": "校园恋爱喜剧，女仆咖啡馆设定很有辨识度。"
    },
    {
      "title": "中二病也要谈恋爱！恋",
      "type": "番剧",
      "score": "9.6",
      "status": "想看",
      "episodes": "全13话",
      "cover": "../assets/acg/bangumi/bangumi-05.webp",
      "link": "https://www.bilibili.com/bangumi/media/md4349",
      "description": "中二病系列续作，延续勇太与六花的关系推进。"
    },
    {
      "title": "中二病也要谈恋爱！",
      "type": "番剧",
      "score": "9.8",
      "status": "想看",
      "episodes": "全13话",
      "cover": "../assets/acg/bangumi/bangumi-06.webp",
      "link": "https://www.bilibili.com/bangumi/media/md4340",
      "description": "青春、中二病和恋爱关系结合得很鲜明的一作。"
    },
    {
      "title": "境界的彼方",
      "type": "番剧",
      "score": "9.5",
      "status": "想看",
      "episodes": "全12话",
      "cover": "../assets/acg/bangumi/bangumi-07.webp",
      "link": "https://www.bilibili.com/bangumi/media/md3365",
      "description": "以异界士和妖梦为核心的青春奇幻作品。"
    },
    {
      "title": "散华礼弥",
      "type": "番剧",
      "score": "9.5",
      "status": "想看",
      "episodes": "全14话",
      "cover": "../assets/acg/bangumi/bangumi-08.webp",
      "link": "https://www.bilibili.com/bangumi/media/md710",
      "description": "围绕僵尸少女展开的恋爱与奇幻故事。"
    },
    {
      "title": "鹿乃子乃子乃子虎视眈眈",
      "type": "番剧",
      "score": "8.3",
      "status": "想看",
      "episodes": "全12话",
      "cover": "../assets/acg/bangumi/bangumi-09.webp",
      "link": "https://www.bilibili.com/bangumi/media/md23187923",
      "description": "电波感和搞笑节奏都很强的日常喜剧。"
    }
  ]
};

const MOMENTS = [
  {
    "id": 1,
    "date": "2026-06-01",
    "mood": "开发",
    "title": "博客功能扩展计划",
    "content": "准备把博客从文章和项目展示，扩展成更完整的个人小窝：归档、标签、分类、瞬间、ACG 收藏和友链页都会慢慢补上。",
    "tags": [
      "博客",
      "开发记录"
    ]
  },
  {
    "id": 2,
    "date": "2026-05-30",
    "mood": "ACG",
    "title": "GalGame 坑位预定",
    "content": "把喜欢的 Gal 和正在做的 GalGame 计划单独放出来，之后可以补封面、评分、游玩记录和剧本进度。",
    "tags": [
      "GalGame",
      "ACG"
    ]
  },
  {
    "id": 3,
    "date": "2026-05-29",
    "mood": "优化",
    "title": "图片和构建链整理",
    "content": "上传图片开始压缩，构建时会生成缩略图，发布产物也改成只包含公开站点资源。",
    "tags": [
      "性能",
      "构建"
    ]
  },
  {
    "id": 4,
    "date": "2026-05-28",
    "mood": "日常",
    "title": "先让这里热闹起来",
    "content": "不是每次都要写成长文。短记录可以留下开发时的想法、当天看的番、踩过的小坑和临时灵感。",
    "tags": [
      "碎碎念"
    ]
  }
];

const FRIEND_LINKS = [
  {
    "name": "Mako",
    "url": "https://blog.hitachi-mako.com",
    "displayUrl": "blog.hitachi-mako.com",
    "badge": "Friend Link",
    "avatar": "../assets/friends/mako.webp",
    "description": "朋友的个人博客，记录技术与生活。"
  },
  {
    "name": "veyliss",
    "url": "https://blog.veyliss.top/",
    "displayUrl": "https://blog.veyliss.top/",
    "avatar": "https://blog.veyliss.top/avatar/avatar.png",
    "description": "探索技术，记录成长，分享所学。",
    "badge": "Friend Link"
  },
  {
    "name": "三叶の小窝",
    "url": "https://blog.mitsuha.space/",
    "displayUrl": "blog.mitsuha.space",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=blog.mitsuha.space&sz=64",
    "description": "安静写生活、技术和日常折腾的小窝。"
  },
  {
    "name": "cosine = 余弦の博客",
    "url": "https://ysx.cosine.ren/",
    "displayUrl": "ysx.cosine.ren",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=ysx.cosine.ren&sz=64",
    "description": "记录算法、开发和一点点生活碎片。"
  },
  {
    "name": "悠见YUFM",
    "url": "https://yufm.com/",
    "displayUrl": "yufm.com",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=yufm.com&sz=64",
    "description": "快工具与慢笔墨并存的个人站。"
  },
  {
    "name": "mxd's Blog",
    "url": "https://blog.mxdyeah.com/",
    "displayUrl": "blog.mxdyeah.com",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=blog.mxdyeah.com&sz=64",
    "description": "偏技术向的个人博客，内容干净利落。"
  },
  {
    "name": "fddm.pages.dev",
    "url": "https://fddm.pages.dev/",
    "displayUrl": "fddm.pages.dev",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=fddm.pages.dev&sz=64",
    "description": "轻量、简洁，适合偶尔翻翻的个人页面。"
  },
  {
    "name": "若志 · 随笔",
    "url": "https://www.rz.sb/",
    "displayUrl": "www.rz.sb",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=www.rz.sb&sz=64",
    "description": "写随笔、经验和个人想法的站点。"
  },
  {
    "name": "理论派",
    "url": "https://sliun.com/",
    "displayUrl": "sliun.com",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=sliun.com&sz=64",
    "description": "关注效率、工具和知识整理的博客。"
  },
  {
    "name": "lhz07's blog",
    "url": "https://lhz07.com/",
    "displayUrl": "lhz07.com",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=lhz07.com&sz=64",
    "description": "技术记录和日常观察都挺清爽的个人博客。"
  },
  {
    "name": "oines — 手記",
    "url": "https://oines.dev/",
    "displayUrl": "oines.dev",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=oines.dev&sz=64",
    "description": "以手记形式保存开发、阅读和生活片段。"
  },
  {
    "name": "Layer 1",
    "url": "https://sunnkynews.icu/",
    "displayUrl": "sunnkynews.icu",
    "badge": "Blogroll",
    "avatar": "https://www.google.com/s2/favicons?domain=sunnkynews.icu&sz=64",
    "description": "从底层开始记录技术和个人探索。"
  }
];

const CHANGELOG = [
  {
    "date": "2026-06-04",
    "title": "新增学习计划栏目",
    "type": "内容",
    "items": [
      "在文章与归档之间新增学习计划导航入口。",
      "整理 Java 后端学习计划、主线训练、面试八股和专项笔记为卡片列表。",
      "学习计划接入归档、RSS 和站点地图。",
      "学习计划接入后台管理，并替换为 19 张独立 WebP 封面。",
      "学习计划卡片支持进入 Markdown 详情页，后台支持上传 MD 文档。",
      "修复学习计划详情页代码高亮污染和长目录布局问题。"
    ]
  },
  {
    "date": "2026-05-30",
    "title": "功能编辑与前端展示优化",
    "type": "体验",
    "items": [
      "修复前端不能上传多张图片",
      "支持gif类图片上传",
      "解决图片粘贴导致崩溃"
    ]
  },
  {
    "date": "2026-05-30",
    "title": "后台与阅读体验升级",
    "type": "功能",
    "items": [
      "接入文章和项目多图管理字段，方便在后台补充过程截图。",
      "增强文章详情页目录、代码块复制和阅读进度。",
      "新增项目复盘详情页与更新日志页面。"
    ]
  },
  {
    "date": "2026-05-29",
    "title": "首屏加载优化",
    "type": "性能",
    "items": [
      "首页改为本地固定背景，页面切换时再预取随机背景。",
      "生成缩略图并用于文章、项目、游戏列表。",
      "移动端降低粒子和挂件开销。"
    ]
  },
  {
    "date": "2026-05-28",
    "title": "站点气质调整",
    "type": "体验",
    "items": [
      "弱化模板化装饰，强调技术博客、项目记录和复盘内容。",
      "精简暂不需要的播放入口。",
      "保留 ACG 视觉元素，但减少首屏网络依赖。"
    ]
  }
];

const SITE_DATA = Object.freeze({
  posts: POSTS,
  projects: PROJECTS,
  learningPlans: LEARNING_PLANS,
  games: GAMES,
  acg: ACG,
  moments: MOMENTS,
  friendLinks: FRIEND_LINKS,
  changelog: CHANGELOG,
});

window.SITE_DATA = SITE_DATA;
