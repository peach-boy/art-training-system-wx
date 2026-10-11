<template>
  <view class="page">
    <text class="title">用户服务协议</text>
    <text class="updated">更新日期：2026年3月</text>
    <view class="section">
      <text class="h">一、服务说明</text>
      <text class="p">「乐橙助教」由上海乐有橙果教育科技有限公司（以下简称「我们」）提供，面向合作培训机构及其教师、管理员、家长，用于课时记录、学员与课包查询、教务数据统计等内部管理功能。</text>
    </view>
    <view class="section">
      <text class="h">二、账号与使用规范</text>
      <text class="p">您应使用机构分配或绑定的账号登录，不得转让、出借账号。您应对账号下的操作负责，并遵守法律法规及机构内部规定。</text>
    </view>
    <view class="section">
      <text class="h">三、个人信息</text>
      <text class="p">我们按《用户隐私保护指引》处理个人信息（如手机号、课堂照片等），仅用于身份核验与教务服务，详情请阅读小程序内隐私保护指引。</text>
    </view>
    <view class="section">
      <text class="h">四、免责声明</text>
      <text class="p">因网络、设备或不可抗力导致的服务中断，我们将在合理范围内协助恢复，但对因此产生的间接损失不承担责任。</text>
    </view>
    <view class="section">
      <text class="h">五、联系我们</text>
      <text class="p">如有疑问，请通过机构管理员或小程序公示的联系方式与我们联系。</text>
    </view>
  </view>
</template>

<script setup>
</script>

<style lang="scss" scoped>
.page {
  padding: 32rpx 36rpx 48rpx;
  background: #fff;
  min-height: 100vh;
  box-sizing: border-box;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #2b1b12;
}

.updated {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a8178;
}

.section {
  margin-top: 36rpx;
}

.h {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2b1b12;
  margin-bottom: 12rpx;
}

.p {
  display: block;
  font-size: 28rpx;
  line-height: 1.75;
  color: #5c534c;
}
</style>
