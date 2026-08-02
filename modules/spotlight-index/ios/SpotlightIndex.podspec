Pod::Spec.new do |s|
  s.name           = 'SpotlightIndex'
  s.version        = '1.0.0'
  s.summary        = 'Core Spotlight indexing for CleanClip'
  s.description    = 'Indexes CleanClip entry names in Spotlight and reports item taps to JS.'
  s.author         = 'daishir0'
  s.homepage       = 'https://github.com/daishir0/cleanclip'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.license        = { :type => 'MIT' }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
