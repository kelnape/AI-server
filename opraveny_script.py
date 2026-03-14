def fibonacci(n):
    fib_sequence = []
    a, b = 0, 1
    for _ in range(n):
        fib_sequence.append(a)
        a, b = b, a + b
    return fib_sequence

# Místo interaktivního vstupu použijeme pevně danou hodnotu
num_terms = 10  # Například 10 prvků Fibonacciho posloupnosti

if num_terms <= 0:
    print("Prosím zadejte kladné celé číslo.")
else:
    result = fibonacci(num_terms)
    print("Fibonacciho posloupnost:")
    print(result)