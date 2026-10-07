#!/usr/bin/env ruby
# frozen_string_literal: true
require "json"
require "yaml"
root = File.expand_path("..", __dir__)
policy = YAML.safe_load(File.read(File.join(root, "factory/config/business-diagnostics.yaml")))
target = File.join(root, "evidence/mockup/business-policy.json")
if ARGV.include?("--check")
  abort("Diagnostic policy projection is stale") unless JSON.parse(File.read(target)) == policy
  puts "Diagnostic policy projection matches YAML."
else
  File.write(target, JSON.pretty_generate(policy) + "\n")
end
