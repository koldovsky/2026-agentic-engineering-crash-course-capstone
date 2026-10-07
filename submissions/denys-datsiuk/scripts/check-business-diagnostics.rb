#!/usr/bin/env ruby
# frozen_string_literal: true
root = File.expand_path("..", __dir__)
abort("Diagnostic policy projection failed") unless system("ruby", File.join(root, "scripts/export-diagnostic-policy.rb"), "--check")
abort("Executable diagnostic evals failed") unless system("node", "--test", File.join(root, "scripts/test-business-diagnostics.mjs"))
