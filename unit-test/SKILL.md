---
name: unit-test
description: 编写优秀的单元测试——FIRST、AAA、Right-BICEP。当用户要求"写单测"、"加测试"、"add unit test"、"这个需要测试"、"补测试用例"、"写test"，或任何编写/评审单元测试的场景时使用。
---

<unit-test>

<core-principle>
优秀的单测不是找 Bug 的工具——是**会说话的业务文档**。三个月后新同事看测试就知道这段代码要做什么。底线：FIRST——Fast、Independent、Repeatable、Self-validating、Timely。打破任何一条，就不是单测。
</core-principle>

<rules>

### 1. AAA——每个测试只做三件事

**Arrange → Act → Assert。** 空行分隔三段，一眼看清准备什么、执行什么、断言什么。

```javascript
test('addProduct: should update item count and total price', () => {
    // Arrange
    const cart = new ShoppingCart();
    const product = { id: 1, name: 'Book', price: 100 };

    // Act
    cart.addProduct(product);

    // Assert
    expect(cart.getItemsCount()).toBe(1);
    expect(cart.getTotalPrice()).toBe(100);
});
```

**违规信号：** 测试里找不到三段分隔、Arrange 超过 10 行（被测对象耦合太多）、Assert 混在 Act 中间。

### 2. Right-BICEP——不知道测什么时逐项过

每写完一个函数，用这六个字母扫一遍是否漏了用例：

| 字母 | 含义 | 具体问自己 |
|------|------|-----------|
| **R**ight | 正常路径 | 正常输入得到正确结果了吗？ |
| **B**oundary | 边界 | null、空字符串、0、负数、MAX_VALUE、空数组、越界——都测了吗？ |
| **I**nverse | 反向操作 | 加密→解密能还原吗？插入→查询能查到吗？sort 后再 reverse 等于逆序吗？ |
| **C**ross-check | 交叉验证 | 用另一种算法（哪怕暴力版）算一遍，结果一致吗？ |
| **E**rror | 异常条件 | 网络断开、文件不存在、JSON 格式错误——代码优雅处理还是崩溃？ |
| **P**erformance | 性能 | 核心算法在 N=1000 时能在 100ms 内完成吗？ |

**注意：** B 和 E 是最容易被跳过的——也是 Bug 最多的地方。P 只对热路径做。

### 3. Mock——凡是 I/O 一律隔离

单元测试测的是**当前单元的逻辑**，不是数据库、不是网络、不是文件系统。

**硬规则：** 网络请求、文件读写、数据库操作、`Date.now()`、`Math.random()`——一律 Mock。不 Mock 就是集成测试，破坏 Fast 和 Repeatable。

```javascript
// ❌ 测试里真的发 HTTP
const user = await fetch('/api/user/1');

// ✅ Mock 掉
const mockFetch = vi.fn().mockResolvedValue({ id: 1, name: 'Alice' });
const user = await getUser(1, mockFetch);
expect(mockFetch).toHaveBeenCalledWith('/api/user/1');
```

**Mock 的信号：** 如果你发现要 Mock 十几个对象才能跑一个测试——被测函数耦合太重，该重构，不是加 Mock。

### 4. 命名——看名字就知道测什么

格式：`被测方法 + 条件 + 预期结果`。三个月后扫一眼测试列表就能定位失败。

```
// ❌
test('test1')
test('calculate works')
test('edge case')

// ✅
test('calculateTax: should return 0 when income is below threshold')
test('withdraw: should throw InsufficientBalance when amount exceeds balance')
test('parseJSON: should throw MalformedError when input is empty string')
```

### 5. 三个禁止

**禁止一：一个测试测多个行为。** 一个 `test()` 只断言一个业务分支。如果中间某行挂掉，后面的断言不执行，排查时不知道到底哪个行为坏了。

```
// ❌ 一个 test 测了添加、删除、清空三个行为
// ✅ 拆成三个 test：add、remove、clear，各断各的
```

**禁止二：测实现细节。** 测试绑定输入和输出，不绑定内部怎么实现的。重构内部结构但行为不变 → 测试必须全绿。私有方法不直接测试——通过公共接口间接覆盖。

```
// ❌ 测内部：expect(service._internalCache.size).toBe(1)
// ✅ 测行为：expect(service.getResult()).toEqual({ ... })
```

**禁止三：测试代码里有 if/for/switch。** 测试代码是平铺直叙的剧本，不是程序。如果测试本身需要逻辑控制流，说明测试设计有问题——应该拆成多个独立用例，而不是在一个用例里分支。

</rules>

<constraints>
- 写完测试跑一遍：没网没数据库能全绿吗？→ 验证 Mock 完整性
- 打乱测试执行顺序还能全绿吗？→ 验证独立性
- 三个月后新人能一眼看懂吗？→ 验证命名和 AAA 清晰度
- 重构内部实现但行为不变，测试全绿吗？→ 验证没测实现细节
</constraints>

</unit-test>
