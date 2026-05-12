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
  s.vendored_frameworks = 'ios/Frameworks/GoMarketMeAppleCoreKit.xcframework'
  s.dependency 'React-Core'
  s.swift_version = '5.9'
end
