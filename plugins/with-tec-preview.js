const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

module.exports = function withTecPreview(config) {
  if (process.env.TEC_MEMBER_PREVIEW !== '1') return config;

  const activityName = 'com.teccarclub.preview.MemberPreviewActivity';
  config = withAndroidManifest(config, mod => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    if (app.activity.some(item => item.$['android:name'] === activityName)) return mod;
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    const filters = main['intent-filter'] || [];
    const launches = filter => filter.action?.some(a => a.$['android:name'] === 'android.intent.action.MAIN')
      && filter.category?.some(c => c.$['android:name'] === 'android.intent.category.LAUNCHER');
    if (!filters.some(launches)) throw new Error('Could not find Android launcher intent');
    main['intent-filter'] = filters.filter(item => !launches(item));
    app.activity.push({
      $: {
        'android:name': activityName,
        'android:exported': 'true',
        'android:launchMode': 'singleTop',
        'android:screenOrientation': 'portrait',
        'android:windowSoftInputMode': 'adjustResize',
        'android:theme': '@android:style/Theme.Material.NoActionBar'
      },
      'intent-filter': [...filters.filter(launches), {
        $: {'android:autoVerify': 'true'},
        action: [{$: {'android:name': 'android.intent.action.VIEW'}}],
        category: ['DEFAULT', 'BROWSABLE'].map(name => ({$: {'android:name': 'android.intent.category.' + name}})),
        data: [{$: {'android:scheme': 'https', 'android:host': 'teccarclub.com', 'android:path': '/android/reset'}}],
        'uri-relative-filter-group': [{
          $: {'android:allow': 'true'},
          data: [{$: {'android:path': '/'}}, {$: {'android:fragmentPrefix': 'email-confirm/'}}]
        }]
      }]
    });
    return mod;
  });

  return withDangerousMod(config, ['android', async mod => {
    const root = mod.modRequest.projectRoot;
    const main = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main');
    const codeDir = path.join(main, 'java', 'com', 'teccarclub', 'preview');
    const assets = path.join(main, 'assets', 'member-preview');
    await fs.mkdir(codeDir, { recursive: true });
    await fs.copyFile(path.join(__dirname, 'tec-preview', 'MemberPreviewActivity.java'),
      path.join(codeDir, 'MemberPreviewActivity.java'));
    await fs.rm(assets, { recursive: true, force: true });
    await fs.cp(path.join(root, 'member-preview'), assets, { recursive: true });
    const shell = await fs.readFile(path.join(assets, 'index.html'), 'utf8');
    await fs.writeFile(path.join(assets, 'member.html'), shell.replace('src="app.js?v=12"', 'src="member.js"'));
    return mod;
  }]);
};
