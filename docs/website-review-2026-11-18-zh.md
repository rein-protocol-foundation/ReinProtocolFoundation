# Rein Protocol Foundation 网站审查

审查日期：2026-11-18（America/Los_Angeles）。对象：https://www.rein-protocol.org/ 。

## 结论

**AI slop 检查：内容与结构层面未通过，基础视觉语言值得保留。**

网站已有明确的暖纸色、Newsreader 衬线字体、橙红强调色和细分隔线，没有常见的霓虹渐变、玻璃卡片、图标卡片墙。问题在于：大量漂亮的使命宣言、重复的编辑式章节和装饰插画，没有得到同等分量的具体人物、项目、活动与治理记录支撑。用户容易感到这是一个完整的机构概念稿，而不是正在开展工作的组织。

最有效的改进是让“谁正在做什么、我现在能怎么参与”成为页面主体。单纯换字体、减少圆角或再生成一套插画，不能解决主要问题。

## 范围与证据边界

- 实际浏览：首页、Mission、Programs、Governance、Giving、Community、Learning Resources、资源提交页、Contributor 申请页。
- Chrome 桌面约 1512×826；390×844 手机视口；320×740 窄屏抽查。视口模拟不等于 iOS Safari 真机测试。
- 检查页面实际呈现、可访问性树、键盘焦点、DOM 尺寸，以及本地组件、CSS、数据降级和测试配置。
- 没有提交注册、申请、资源或捐赠，没有发送邮件，没有验证外部 Discord 加入流程。
- 本地基线为 `c7db509`。线上存在本地没有的标题、链接和路由行为；以下线上事实以浏览器为准，文件引用是本地对应实现位置，不代表已经核对生产 commit。
- 未运行 Lighthouse、弱网测试、Firefox、WebKit、读屏软件或真实 200% 文本缩放。未测量的性能与浏览器兼容性不作为确定故障。

共记录 15 项：高优先级 5 项、中优先级 9 项、低优先级 1 项。没有发现可据此认定的全站不可用故障。

## 高优先级

### 01. 首屏没有主要行动，导航最强按钮通向暂不可用的捐赠

- **位置**：[首页](https://www.rein-protocol.org/)、[Giving](https://www.rein-protocol.org/giving)；`components/institutional-pages.tsx:76`、`components/site-header.tsx:125`。
- **实测**：首页首屏只有标题、介绍和三条原则，没有参与按钮。Giving 是桌面导航唯一实心按钮；目标页明确表示还没有获准的付款链接或钱包地址。
- **移动端证据**：390×844 时 hero 高 768px；正文首个链接约在文档 y=1261px，学习资料入口约 y=3946px，Explore the community 约 y=4536px。这些数值对应本次渲染，不是固定布局常量。
- **影响**：第一次访问的人知道使命，却不知道从哪开始；视觉优先级与现阶段实际可完成的任务相反。
- **建议**：首屏提供 Join the community，次级入口 Browse learning resources；捐赠未开放时降低 Giving 权重，并提供真实的联系/关注方式。不要为了修设计绕过捐赠审批或启用收款。
- **建议技能**：`/onboard`、`/arrange`。

### 02. People 区域只有标题，没有人

- **位置**：[Community / People](https://www.rein-protocol.org/community#people)；`app/(site)/community/page.tsx:54`、`:121`。
- **实测**：异步内容加载后，区域仍只有 People behind the work 和 Directors and Core Contributors…，没有名字、肖像或人物链接。大片留白并非仍在加载的骨架屏。
- **实现证据**：人物为空时子组件返回 null，父级标题与完整区块仍渲染；查询仅选择 published 且 featured 的人物。
- **影响**：这是机构可信度最直接的缺口。站点反复强调 human accountability，用户却找不到承担责任的人。
- **建议**：优先发布经本人授权的实际负责人介绍；没有可发布人物时隐藏整块空区域，保留合适的组织联系入口。需先区分无数据、未标记 featured、查询错误，不能认定组织没有成员。
- **建议技能**：`/harden`、`/distill`。

### 03. 活跃度文案并不由活跃数据支撑

- **位置**：首页与社区标题；`lib/community/presentation.ts:1`、`lib/community/data.ts:8`、`components/site-footer.tsx:23`。
- **实测**：页面显示 many active participants；页脚另有 The first AI-native nonprofit organization 的首创表述。
- **实现证据**：`publicCommunityAudience(total)` 在总数不超过 1000 时一律返回 many active participants，包括 0。输入是 allTime，不是活跃人数；数据请求失败也会降级为 0。
- **影响**：总量、活跃度和未知状态被混为一谈。这是具体的可信度问题，不只是文案口味。页脚的“first”在已检查页面里没有可核查依据，本次并未判定它必然不实。
- **建议**：没有可靠口径时改用不带规模断言的社区定位；展示数字时说明统计口径和日期；活跃度需使用真实活跃指标。首创宣称应提供依据或删除。
- **建议技能**：`/clarify`、`/harden`。

### 05. 手机菜单视觉上关闭，键盘仍进入隐藏链接

- **位置**：手机端全站主导航；`src/App.css` 中 `.primary-navigation`；`components/site-header.tsx:108`。
- **复现**：390px 宽，菜单关闭；在 Open navigation 按钮上按 Tab。
- **结果**：`document.activeElement` 是 `<a href="/">Home</a>`，而父导航的 opacity 为 0、visibility 为 visible。焦点落到了看不见的链接。
- **原因**：仅 opacity 和 pointer-events 隐藏菜单，不会从键盘焦点顺序或可访问性树中移除链接。
- **影响**：键盘用户无法看到当前位置；使用窄窗口、放大页面或辅助技术时都会受影响。
- **建议**：关闭时真正隐藏/移除交互性，正确同步展开状态；Escape 关闭后恢复到菜单按钮。补充“菜单关闭后 Tab 不进入链接”的行为测试。
- **标准关联**：焦点可见性与焦点顺序；本次不等同于完整 WCAG 合规评估。
- **建议技能**：`/harden`。

### 06. 治理承诺缺少可查阅的记录入口

- **位置**：[Governance](https://www.rein-protocol.org/governance)；`components/institutional-pages.tsx:158`。
- **实测**：页面描述 Board、DAO collective vote、Live / Monthly / Quarterly / Annual 发布节奏，但没有相关章程、提案、投票或报告链接；末尾行动是跳到 Giving，Giving 又链接回治理模式。
- **影响**：读者无法区分已运行制度、已批准制度与未来计划。透明度以文字宣言表达，不能通过页面验证。
- **建议**：明确每项制度当前状态；已有记录就直接链接并显示日期。尚未启用的机制清楚写为计划；没有报告不应伪造报告或把频率标签做得像已经持续披露。
- **建议技能**：`/clarify`、`/onboard`。

## 中优先级

### 04. 活动被反复承诺，当前无活动时却缺少下一步

- **位置**：[Programs](https://www.rein-protocol.org/programs)、[Community / Program](https://www.rein-protocol.org/community#program)；`app/(site)/community/page.tsx:31`、`:49`。
- **实测**：两个页面反复介绍线下活动，本次社区页没有显示具体 Upcoming events、日期、城市或报名行动。
- **边界**：这不能证明后台没有任何活动；可能是没有即将开始的已发布活动，也可能是查询失败。
- **影响**：期待找活动的人读完介绍仍无法完成任务。没有活动本身不是错误，没有面向用户的状态和替代路径才是问题。
- **建议**：有活动时展示最近一场；确实没有近期安排时简短说明，并提供关注通知、Discord 或提出活动建议的直接链接，避免保留一整段无落点的宣传。
- **建议技能**：`/onboard`、`/harden`。

### 07. 页面重复解释使命，阅读成本高于信息增量

- **位置**：首页、Mission、Programs、Community；`components/institutional-pages.tsx:12`、`:87`、`:135`、`:147`。
- **观察**：meet / learn / share / community、两类 early programs、human accountability 在多个页面反复出现。常见节奏是编号小标题、大衬线标题、抽象段落、更多说明。
- **影响**：看了几个页面仍难回答“最近完成了什么”。形式有机构感，但内容像同一个提示词的多次扩写。
- **建议**：首页讲使命和最新工作；Programs 展示具体项目/活动；Community 负责加入与参与；Mission 保留价值立场和研究范围。将重合段落替换为具体成果、负责人、日期、项目链接，而不只是换同义词。
- **建议技能**：`/distill`、`/clarify`。

### 08. 拼贴插画使用过密，不能承担组织实证的作用

- **位置**：首页和各机构页 hero、Community hero；`components/institutional-pages.tsx` 的插画引用、`app/(site)/community/page.tsx:113`。
- **观察**：地标、纸张纹理、橙色路径、抽象人物和概念性 caption 形成统一风格；但社区页仍使用抽象人群，项目页以 Stanford 地标作为主要视觉。
- **影响**：同一种视觉配方遍布不同任务页面，使内容显得可互换。对机构关系也可能产生误读：地标图不应替代真实活动或合作关系的说明。
- **建议**：保留首页代表性插画；社区优先真实成员/聚会资料，项目优先工作产物或图解。没有授权实拍时，宁可用清楚的文字与实际项目记录，不伪造活动照片。地标的装饰属性和机构关系应清晰。
- **正面点**：Image credits 已说明这些是拼贴演绎而非纪实照片，应保留。
- **建议技能**：`/critique`、`/distill`。

### 09. 学习目录有内容，却没有帮助用户作选择

- **位置**：[Learning Resources](https://www.rein-protocol.org/community/learn)；`app/(site)/community/learn/page.tsx:24`、`components/resource-card.tsx`。
- **实测**：第一页 12 条资源，带类型、语言、难度；没有按这些维度筛选或搜索，也没有推荐学习顺序。Beginner 同时包含适合非技术人员和需要 Python 基础的材料。
- **影响**：用户被要求逐条读长摘要来判断适合程度。目录有资料，但不像有人在带领新手学习。
- **建议**：先提供少量人工策划的入口，如“第一次了解 agent”“开发第一个 agent”“权限与安全评估”；添加语言/技术基础筛选。摘要将适用人群、前置知识、练习成本与学习结果分开表达。
- **建议技能**：`/onboard`、`/arrange`。

### 10. 订阅更新的表单比任务需要更重

- **位置**：[Community / Connect](https://www.rein-protocol.org/community#register)；`components/forms/participant-form.tsx:33`、`components/forms/form-controls.tsx:108`。
- **实测**：除了邮箱，还要求行业、州/国家、城市，并有两项同意勾选；名称是 Register for community updates。
- **影响**：用户只是想收到动态，却被要求完成成员画像。行业在 Contributor 申请页可选，在简单订阅中反而必填，轻重顺序不一致。
- **建议**：邮箱作为最小提交集；地区、行业在订阅后可选补充，或只在用户选择本地活动提醒时请求。保留必要的同意机制，并解释所收信息的用途。
- **建议技能**：`/distill`、`/onboard`。

### 11. 全球社区的入口仍以美国用户为默认

- **位置**：订阅和 Contributor 表单；`components/forms/form-controls.tsx:89`。
- **实测**：默认出现美国州列表，国际用户先要打开 Outside the United States 开关，才出现国家选择；本次查看的主要公共页面无语言切换。
- **影响**：增加国际用户的理解步骤，也削弱“global community”的直觉。仅英文并非自动构成缺陷，但与全球新手定位存在取舍。
- **建议**：使用统一 Country/Region 入口，再按国家展示下一级地区；优先为加入说明、核心表单和常见问题提供目标用户实际需要的语言版本。
- **建议技能**：`/adapt`、`/clarify`。

### 12. 二级导航名称不直观，窄屏隐藏了尾部选项

- **位置**：Community 二级导航；`components/site-header.tsx:17`、`src/App.css:36`。
- **实测**：320px 下 Contribute 的右边界约 340.8px，被裁掉一部分；导航可以横向滚动，但滚动条被隐藏。文字约 11.84px，链接高 40px。
- **信息架构问题**：Program 与主导航 Programs 易混淆；Connect 实际跳到邮件订阅，而 Discord 加入链接在 Program 中；学习资源页高亮的也是 Program。
- **另一线上现象**：Community 内 Explore ways to contribute 的目标 `/community/contribute` 导航后仍回到当前 `#contribute`，没有新增信息。与本地独立 Contribute 页实现不一致，需以生产配置进一步定位。
- **建议**：改成任务导向名称，例如 Events & learning、People、Email updates、Contribute；加入聊天单独提供直接入口。窄屏增加明确的滚动提示或改用适合空间的布局。40px 本身不应被直接声称为 WCAG AA 不合规，但触控舒适度仍可提高。
- **建议技能**：`/adapt`、`/clarify`。

### 13. 静态加入入口被不相关的数据请求拖后

- **位置**：Community；`app/(site)/community/page.tsx:26`、`:65`、`:117`。
- **实测**：初始页面中项目内容只有占位，后续才出现 Discord、课程和贡献路径。
- **实现证据**：CommunityProgram 先等资源和活动两个请求一起完成，再返回整块内容，连不依赖它们的说明和 Discord 邀请也被一起延后。占位高度与资源长列表差异明显。
- **影响**：核心参与入口对后端延迟敏感；内容插入还可能影响锚点落点与阅读位置。本次未测得 CLS 分数，不把它写成已量化的性能失败。
- **建议**：把静态说明、Discord 邀请与动态资源/活动拆开；分别使用尺寸接近最终内容的占位或稳定布局。用弱网测试验证首次进入和锚点跳转。
- **建议技能**：`/optimize`、`/harden`。

### 14. 数据读取失败和真正无内容使用同一种界面

- **位置**：`lib/community/data.ts:10`、`:23`、`:33`、`:43`。
- **代码证据**：metrics 查询错误返回零；people、resources、events 查询错误返回空数组。页面据此显示空白人物区、隐藏活动或邀请用户帮助建设资源库。
- **影响**：暂时性服务故障可能伪装成组织缺少内容；用户和运营者都难以理解发生了什么。
- **建议**：区分 success-empty 与 unavailable；记录服务端错误，面向用户提供简洁恢复方式或最近成功的数据。不要把服务配置或内部异常堆到公共文案里。
- **边界**：本次没有故障注入，不认定线上空人物区就是数据库错误。
- **建议技能**：`/harden`。

## 低优先级

### 15. 所有资源链接都叫 Open resource

- **位置**：Learning Resources 和社区资源预览；`components/resource-card.tsx:14`。
- **实测**：第一页 12 个链接具有相同文字，无单独的 aria-label；资源标题本身不是链接。
- **影响**：链接列表或快速跳转中不易判断目标，也让用户更难直接点标题打开资源。
- **建议**：使资源标题成为描述明确的链接，或为行动补充资源名称。由于周边文章标题提供了上下文，不据此直接判定所有链接违反 WCAG。
- **建议技能**：`/clarify`、`/harden`。

## 应保留的实现

- 暖色、Newsreader/Manrope、细线和相对克制的配色已经具有一致性；不需要换成另一套流行模板。
- 390px 抽查的首页、社区页和 320px 学习页没有页面级横向溢出；二级导航的内部横滚是另一个问题。
- 订阅表单输入字号为 16px，高度为 44px；菜单按钮为 48px；已有可见标签和原生输入控件。
- 有 skip link、全局 focus-visible、prefers-reduced-motion 处理、本地字体和部分图片延迟加载。
- 学习资料说明了前置知识和练习可能产生的成本；申请页解释了后续最多 30 分钟的交流，以及 24 小时邮箱验证。这些比泛化营销话术更有帮助。
- 捐赠未开放的状态披露清晰；应调整入口优先级，而不是删掉必要事实。

## 兼容性验证缺口

`playwright.config.ts` 当前普通 E2E 只有 Chromium；名为 mobile 的 iPhone 13 配置也明确使用 Chromium，因此不能代表 Safari 已通过。后续至少补 WebKit 与 Firefox，覆盖导航、表单、弹层、锚点和资源分页；再测试 200% 文本缩放、触屏软键盘和弱网。

本次没有证据支持“Safari 已经坏了”“整体对比度不合格”“LCP 超标”之类结论。现代 CSS 颜色和视口单位的旧浏览器支持，应根据实际支持范围单独验证。

## 建议执行顺序

1. **立即**：解决隐藏菜单焦点；去掉未经指标支撑的活跃描述；处理空 People 区；将主要行动移到真实可用的社区/学习入口。
2. **下一轮内容整理**：为真实项目、人员、活动、治理文件提供可查证入口；压缩 Home / Mission / Programs / Community 的重复解释；明确当前状态和计划。
3. **下一轮交互整理**：简化订阅、重命名二级导航、建立学习路径、拆分异步内容与错误状态。
4. **验证**：用任务而非页面截图检查结果——新用户能否迅速找到如何加入、学习什么、谁在负责、最近做了什么；同时完成跨浏览器与键盘回归。

设计取舍应围绕三个问题：首屏最重要的任务是什么；每个大标题下面有什么可验证事实；去掉插画后，页面是否仍能清楚体现 Rein 独有的工作。

本次仅新增审查文档，未修改网站实现或发布线上内容。
