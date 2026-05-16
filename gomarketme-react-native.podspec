require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'gomarketme-react-native'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.author       = package['author']
  s.source       = { :git => package['repository']['url'], :tag => s.version.to_s }

  s.platforms    = { :ios => '15.0' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'

  # GoMarketMeAppleCoreKit.xcframework is built as a static XCFramework.
  s.vendored_frameworks = 'ios/Frameworks/GoMarketMeAppleCoreKit.xcframework'
  s.static_framework = true

  s.dependency 'React-Core'
  s.swift_version = '5.9'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.9'
  }
end