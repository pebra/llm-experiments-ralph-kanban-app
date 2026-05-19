def fibonacci(n)
  raise ArgumentError, "n must be non-negative" if n < 0

  return n if n <= 1

  a, b = 0, 1
  (2..n).each do
    a, b = b, a + b
  end
  b
end

def fibonacci_sequence(count)
  raise ArgumentError, "count must be positive" if count <= 0

  sequence = []
  a, b = 0, 1
  count.times do
    sequence << a
    a, b = b, a + b
  end
  sequence
end

# Examples
puts "fibonacci(10) = #{fibonacci(10)}"
puts "First 10 Fibonacci numbers: #{fibonacci_sequence(10).inspect}"
