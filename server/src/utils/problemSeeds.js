function makeSamples(samples) {
  return samples.map((sample) => ({ ...sample, visible: true }));
}

function makeTestCases(cases, visibleCount = 3) {
  return cases.map((test, index) => ({
    input: test.input,
    output: test.output,
    visible: index < visibleCount
  }));
}

function createProblem({ title, slug, difficulty, tags, grade, description, explanation, constraints, inputFormat, outputFormat, samples, testCases, timeLimitMs, memoryLimitMb }) {
  return {
    title,
    slug,
    difficulty,
    tags,
    grade,
    description,
    explanation,
    constraints,
    inputFormat,
    outputFormat,
    samples: makeSamples(samples),
    hints: [],
    timeLimitMs,
    memoryLimitMb,
    testCases: makeTestCases(testCases, 3)
  };
}

const easyProblems = [
  createProblem({
    title: "Sum of Two Numbers",
    slug: "sum-of-two-numbers",
    difficulty: "easy",
    tags: ["operators", "input/output"],
    grade: "grade1",
    description: "Read two integers from input and print their sum.",
    explanation: "This beginner exercise tests reading values, converting them to integers, and printing arithmetic results.",
    constraints: "Numbers are within -1000 to 1000.",
    inputFormat: "Two integers separated by a space.",
    outputFormat: "A single integer representing the sum.",
    samples: [
      { input: "3 4", output: "7", explanation: "3 plus 4 equals 7." },
      { input: "-2 5", output: "3", explanation: "-2 plus 5 equals 3." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0 0", output: "0" },
      { input: "10 15", output: "25" },
      { input: "-5 -7", output: "-12" },
      { input: "1000 -500", output: "500" },
      { input: "-1000 1000", output: "0" },
      { input: "123 456", output: "579" },
      { input: "-1 1", output: "0" },
      { input: "999 1", output: "1000" },
      { input: "-250 250", output: "0" },
      { input: "7 8", output: "15" },
      { input: "12 -3", output: "9" },
      { input: "4 4", output: "8" }
    ]
  }),
  createProblem({
    title: "Even or Odd",
    slug: "even-or-odd",
    difficulty: "easy",
    tags: ["if-else", "operators", "input/output"],
    grade: "grade1",
    description: "Read an integer and print 'Even' if it is even, otherwise print 'Odd'.",
    explanation: "This problem tests conditional logic and modulo operators.",
    constraints: "The integer fits in 32-bit signed range.",
    inputFormat: "A single integer.",
    outputFormat: "The string Even or Odd.",
    samples: [
      { input: "8", output: "Even", explanation: "8 is divisible by 2." },
      { input: "7", output: "Odd", explanation: "7 leaves a remainder when divided by 2." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0", output: "Even" },
      { input: "1", output: "Odd" },
      { input: "2", output: "Even" },
      { input: "-3", output: "Odd" },
      { input: "-4", output: "Even" },
      { input: "15", output: "Odd" },
      { input: "100", output: "Even" },
      { input: "999", output: "Odd" },
      { input: "1024", output: "Even" },
      { input: "-101", output: "Odd" },
      { input: "25", output: "Odd" },
      { input: "88", output: "Even" }
    ]
  }),
  createProblem({
    title: "Largest of Three Numbers",
    slug: "largest-of-three-numbers",
    difficulty: "easy",
    tags: ["if-else", "input/output"],
    grade: "grade1",
    description: "Read three integers and print the largest value.",
    explanation: "The solution should compare the values and return the maximum.",
    constraints: "Input values are between -1000 and 1000.",
    inputFormat: "Three integers separated by spaces.",
    outputFormat: "One integer — the largest number.",
    samples: [
      { input: "4 7 2", output: "7", explanation: "7 is the greatest of the three values." },
      { input: "-1 -5 -3", output: "-1", explanation: "-1 is the largest among the negative numbers." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1 2 3", output: "3" },
      { input: "5 5 2", output: "5" },
      { input: "-3 -2 -1", output: "-1" },
      { input: "100 0 99", output: "100" },
      { input: "7 7 7", output: "7" },
      { input: "8 3 9", output: "9" },
      { input: "-10 10 0", output: "10" },
      { input: "-1 1 -2", output: "1" },
      { input: "0 0 -1", output: "0" },
      { input: "2 8 6", output: "8" },
      { input: "-5 -5 -2", output: "-2" },
      { input: "20 20 15", output: "20" }
    ]
  }),
  createProblem({
    title: "Simple Interest Calculator",
    slug: "simple-interest-calculator",
    difficulty: "easy",
    tags: ["operators", "input/output"],
    grade: "grade1",
    description: "Calculate the simple interest for a principal amount, rate, and time period.",
    explanation: "Simple interest uses the formula (P * R * T) / 100.",
    constraints: "Principal, rate, and time are positive integers less than 10,000.",
    inputFormat: "Three integers: principal, rate, and time separated by spaces.",
    outputFormat: "A single integer representing the interest amount.",
    samples: [
      { input: "1000 5 2", output: "100", explanation: "Interest = 1000*5*2/100 = 100." },
      { input: "500 3 4", output: "60", explanation: "Interest = 500*3*4/100 = 60." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1000 10 1", output: "100" },
      { input: "2000 5 2", output: "200" },
      { input: "1500 4 3", output: "180" },
      { input: "500 8 5", output: "200" },
      { input: "999 2 2", output: "39" },
      { input: "100 5 10", output: "50" },
      { input: "800 6 4", output: "192" },
      { input: "1200 7 2", output: "168" },
      { input: "300 5 6", output: "90" },
      { input: "250 9 3", output: "67" },
      { input: "1100 4 5", output: "220" },
      { input: "700 3 4", output: "84" }
    ]
  }),
  createProblem({
    title: "Multiples of 3 and 5",
    slug: "multiples-of-3-and-5",
    difficulty: "easy",
    tags: ["loops", "if-else", "input/output"],
    grade: "grade1",
    description: "Read a positive integer n and print the sum of all numbers from 1 to n that are multiples of 3 or 5.",
    explanation: "Use a loop and conditional checks to accumulate valid values.",
    constraints: "1 ≤ n ≤ 1000.",
    inputFormat: "A single positive integer n.",
    outputFormat: "A single integer representing the sum.",
    samples: [
      { input: "10", output: "33", explanation: "3+5+6+9+10 = 33." },
      { input: "5", output: "8", explanation: "3+5 = 8." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1", output: "0" },
      { input: "3", output: "3" },
      { input: "5", output: "8" },
      { input: "10", output: "33" },
      { input: "15", output: "60" },
      { input: "20", output: "98" },
      { input: "25", output: "168" },
      { input: "30", output: "195" },
      { input: "50", output: "543" },
      { input: "100", output: "2418" },
      { input: "2", output: "0" },
      { input: "7", output: "21" }
    ]
  }),
  createProblem({
    title: "Count Vowels",
    slug: "count-vowels",
    difficulty: "easy",
    tags: ["strings", "loops"],
    grade: "grade1",
    description: "Count the number of vowels in the input string and print the result.",
    explanation: "Iterate through each character and check membership in a vowel set.",
    constraints: "The string length is at most 200 characters.",
    inputFormat: "A single line containing text.",
    outputFormat: "A single integer representing the vowel count.",
    samples: [
      { input: "hello", output: "2", explanation: "e and o are vowels." },
      { input: "Python", output: "1", explanation: "Only o is a vowel." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "aeiou", output: "5" },
      { input: "bcdfg", output: "0" },
      { input: "Hello World", output: "3" },
      { input: "Robokidy", output: "3" },
      { input: "AEIOU", output: "5" },
      { input: "Python programming", output: "5" },
      { input: "", output: "0" },
      { input: "Data Science", output: "5" },
      { input: "stack overflow", output: "4" },
      { input: "Grade Four", output: "4" },
      { input: "Easy Problem", output: "5" },
      { input: "Learn Coding", output: "4" }
    ]
  }),
  createProblem({
    title: "Reverse String",
    slug: "reverse-string",
    difficulty: "easy",
    tags: ["strings", "functions"],
    grade: "grade2",
    description: "Reverse the given string and print the result.",
    explanation: "String reversal can be done with slicing or a loop.",
    constraints: "The string length is at most 200 characters.",
    inputFormat: "A single line containing text.",
    outputFormat: "The reversed string.",
    samples: [
      { input: "learn", output: "nrael", explanation: "The characters are reversed." },
      { input: "abc", output: "cba", explanation: "abc reversed is cba." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "hello", output: "olleh" },
      { input: "Robokidy", output: "ydikoboR" },
      { input: "Python", output: "nohtyP" },
      { input: "racecar", output: "racecar" },
      { input: "", output: "" },
      { input: "a", output: "a" },
      { input: "12345", output: "54321" },
      { input: "leet code", output: "edoc teel" },
      { input: "easy problem", output: "melborp ysae" },
      { input: "Grade One", output: "enO edarG" },
      { input: "OpenAI", output: "IAnepO" },
      { input: "Stack", output: "kcatS" }
    ]
  }),
  createProblem({
    title: "Palindrome Check",
    slug: "palindrome-check",
    difficulty: "easy",
    tags: ["strings", "if-else"],
    grade: "grade2",
    description: "Determine whether the input string is a palindrome and print True or False.",
    explanation: "A palindrome reads the same forwards and backwards. Ignore case when comparing.",
    constraints: "Input length is at most 200 characters.",
    inputFormat: "A single string.",
    outputFormat: "True or False.",
    samples: [
      { input: "Level", output: "True", explanation: "Level is a palindrome ignoring case." },
      { input: "Hello", output: "False", explanation: "Hello is not a palindrome." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "madam", output: "True" },
      { input: "racecar", output: "True" },
      { input: "python", output: "False" },
      { input: "Rotor", output: "True" },
      { input: "OpenAI", output: "False" },
      { input: "", output: "True" },
      { input: "A", output: "True" },
      { input: "Noon", output: "True" },
      { input: "Step on no pets", output: "False" },
      { input: "abcba", output: "True" },
      { input: "abccba", output: "True" },
      { input: "abca", output: "False" }
    ]
  }),
  createProblem({
    title: "Sum of List Elements",
    slug: "sum-of-list-elements",
    difficulty: "easy",
    tags: ["lists", "loops"],
    grade: "grade2",
    description: "Read a list of integers and print the sum of all elements.",
    explanation: "Split the input line into integers and accumulate the total.",
    constraints: "List length is at most 50 and each value is between -1000 and 1000.",
    inputFormat: "First line contains n, second line contains n integers separated by spaces.",
    outputFormat: "A single integer representing the sum.",
    samples: [
      { input: "5\n1 2 3 4 5", output: "15", explanation: "Sum of the list is 15." },
      { input: "3\n-1 0 2", output: "1", explanation: "-1 + 0 + 2 = 1." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "4\n1 1 1 1", output: "4" },
      { input: "5\n10 20 30 40 50", output: "150" },
      { input: "3\n-2 -3 5", output: "0" },
      { input: "1\n100", output: "100" },
      { input: "2\n-5 5", output: "0" },
      { input: "6\n0 0 0 0 0 0", output: "0" },
      { input: "5\n1 2 3 4 -10", output: "0" },
      { input: "7\n10 9 8 7 6 5 4", output: "49" },
      { input: "3\n100 200 -50", output: "250" },
      { input: "4\n-1 -1 -1 -1", output: "-4" },
      { input: "3\n2 2 2", output: "6" },
      { input: "5\n5 0 0 5 0", output: "10" }
    ]
  }),
  createProblem({
    title: "Average of Numbers",
    slug: "average-of-numbers",
    difficulty: "easy",
    tags: ["lists", "operators"],
    grade: "grade2",
    description: "Compute the average of a list of integers and print the result rounded down to the nearest integer.",
    explanation: "The average equals sum divided by count; use integer division for the final answer.",
    constraints: "1 ≤ n ≤ 50 and each number is between -1000 and 1000.",
    inputFormat: "First line is n, second line contains n integers.",
    outputFormat: "The integer average.",
    samples: [
      { input: "4\n2 3 4 5", output: "3", explanation: "Average is 14/4 = 3.5, rounded down to 3." },
      { input: "3\n1 1 2", output: "1", explanation: "Average is 4/3 = 1.33, rounded down to 1." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "5\n1 2 3 4 5", output: "3" },
      { input: "2\n10 11", output: "10" },
      { input: "3\n0 0 1", output: "0" },
      { input: "4\n-1 -1 0 0", output: "-1" },
      { input: "3\n5 5 5", output: "5" },
      { input: "6\n1 2 3 4 5 6", output: "3" },
      { input: "1\n99", output: "99" },
      { input: "3\n2 3 4", output: "3" },
      { input: "4\n7 8 9 10", output: "8" },
      { input: "5\n-2 -2 -2 -2 -2", output: "-2" },
      { input: "5\n1 1 1 1 2", output: "1" },
      { input: "3\n10 20 30", output: "20" }
    ]
  }),
  createProblem({
    title: "Factorial Calculator",
    slug: "factorial-calculator",
    difficulty: "easy",
    tags: ["functions", "loops"],
    grade: "grade2",
    description: "Read a non-negative integer and print its factorial.",
    explanation: "Factorial of n is the product of all integers from 1 to n. Use a loop or recursion.",
    constraints: "0 ≤ n ≤ 10.",
    inputFormat: "A single integer n.",
    outputFormat: "A single integer representing n!.",
    samples: [
      { input: "5", output: "120", explanation: "5! = 120." },
      { input: "0", output: "1", explanation: "0! is defined as 1." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0", output: "1" },
      { input: "1", output: "1" },
      { input: "3", output: "6" },
      { input: "4", output: "24" },
      { input: "6", output: "720" },
      { input: "7", output: "5040" },
      { input: "8", output: "40320" },
      { input: "9", output: "362880" },
      { input: "10", output: "3628800" },
      { input: "2", output: "2" },
      { input: "5", output: "120" },
      { input: "1", output: "1" }
    ]
  }),
  createProblem({
    title: "Fibonacci Number",
    slug: "fibonacci-number",
    difficulty: "easy",
    tags: ["loops", "functions"],
    grade: "grade3",
    description: "Print the nth Fibonacci number, where the sequence begins with 0 and 1.",
    explanation: "Use iteration or recursion to compute the sequence value at position n.",
    constraints: "0 ≤ n ≤ 20.",
    inputFormat: "A single integer n.",
    outputFormat: "The nth Fibonacci number.",
    samples: [
      { input: "6", output: "8", explanation: "Sequence: 0,1,1,2,3,5,8." },
      { input: "0", output: "0", explanation: "The first Fibonacci number is 0." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0", output: "0" },
      { input: "1", output: "1" },
      { input: "2", output: "1" },
      { input: "3", output: "2" },
      { input: "4", output: "3" },
      { input: "5", output: "5" },
      { input: "6", output: "8" },
      { input: "7", output: "13" },
      { input: "8", output: "21" },
      { input: "9", output: "34" },
      { input: "10", output: "55" },
      { input: "12", output: "144" }
    ]
  }),
  createProblem({
    title: "Squares of Numbers",
    slug: "squares-of-numbers",
    difficulty: "easy",
    tags: ["loops", "lists"],
    grade: "grade3",
    description: "Read a number n and print the squares of numbers from 1 to n separated by spaces.",
    explanation: "Generate the first n square numbers and print them in one line.",
    constraints: "1 ≤ n ≤ 20.",
    inputFormat: "A single integer n.",
    outputFormat: "n integers separated by spaces." ,
    samples: [
      { input: "5", output: "1 4 9 16 25", explanation: "Squares from 1 through 5." },
      { input: "3", output: "1 4 9", explanation: "Squares from 1 through 3." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1", output: "1" },
      { input: "2", output: "1 4" },
      { input: "3", output: "1 4 9" },
      { input: "4", output: "1 4 9 16" },
      { input: "5", output: "1 4 9 16 25" },
      { input: "6", output: "1 4 9 16 25 36" },
      { input: "7", output: "1 4 9 16 25 36 49" },
      { input: "8", output: "1 4 9 16 25 36 49 64" },
      { input: "9", output: "1 4 9 16 25 36 49 64 81" },
      { input: "10", output: "1 4 9 16 25 36 49 64 81 100" },
      { input: "12", output: "1 4 9 16 25 36 49 64 81 100 121 144" },
      { input: "15", output: "1 4 9 16 25 36 49 64 81 100 121 144 169 196 225" }
    ]
  }),
  createProblem({
    title: "Word Count",
    slug: "word-count",
    difficulty: "easy",
    tags: ["strings", "functions"],
    grade: "grade3",
    description: "Count the number of words in a line of text and print the total.",
    explanation: "Split the input by whitespace and count non-empty tokens.",
    constraints: "Input line length at most 200 characters.",
    inputFormat: "A single line of text.",
    outputFormat: "A single integer representing word count.",
    samples: [
      { input: "Hello world", output: "2", explanation: "Two words are present." },
      { input: "Python  programming", output: "2", explanation: "Extra spaces are ignored." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "One two three", output: "3" },
      { input: "   Leading spaces", output: "2" },
      { input: "Trailing spaces   ", output: "2" },
      { input: "Multiple   spaces between words", output: "4" },
      { input: "", output: "0" },
      { input: "Single", output: "1" },
      { input: "Hello world from Python", output: "4" },
      { input: "A B C D E", output: "5" },
      { input: "One\nTwo", output: "1" },
      { input: "Tab\tseparated", output: "2" },
      { input: "Two words", output: "2" },
      { input: "spaces   and\t tabs", output: "3" }
    ]
  }),
  createProblem({
    title: "Sum of Digits",
    slug: "sum-of-digits",
    difficulty: "easy",
    tags: ["operators", "strings"],
    grade: "grade3",
    description: "Read a non-negative integer and print the sum of its digits.",
    explanation: "Convert the number to a string or use modulo arithmetic to accumulate the digits.",
    constraints: "The number has at most 100 digits.",
    inputFormat: "A single non-negative integer.",
    outputFormat: "A single integer representing the digit sum.",
    samples: [
      { input: "123", output: "6", explanation: "1+2+3 = 6." },
      { input: "1005", output: "6", explanation: "1+0+0+5 = 6." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0", output: "0" },
      { input: "5", output: "5" },
      { input: "123", output: "6" },
      { input: "999", output: "27" },
      { input: "100", output: "1" },
      { input: "2021", output: "5" },
      { input: "314159", output: "23" },
      { input: "987654", output: "39" },
      { input: "100000", output: "1" },
      { input: "777", output: "21" },
      { input: "404", output: "8" },
      { input: "123456789", output: "45" }
    ]
  }),
  createProblem({
    title: "Temperature Conversion",
    slug: "temperature-conversion",
    difficulty: "easy",
    tags: ["operators", "input/output"],
    grade: "grade3",
    description: "Convert a temperature from Celsius to Fahrenheit and print the integer result rounded down.",
    explanation: "Use the formula F = C * 9/5 + 32 and output the floor of the result.",
    constraints: "Celsius value is between -100 and 100.",
    inputFormat: "A single integer representing degrees Celsius.",
    outputFormat: "A single integer representing degrees Fahrenheit.",
    samples: [
      { input: "0", output: "32", explanation: "0°C = 32°F." },
      { input: "25", output: "77", explanation: "25°C = 77°F." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "0", output: "32" },
      { input: "100", output: "212" },
      { input: "-40", output: "-40" },
      { input: "30", output: "86" },
      { input: "-10", output: "14" },
      { input: "20", output: "68" },
      { input: "37", output: "98" },
      { input: "-5", output: "23" },
      { input: "15", output: "59" },
      { input: "40", output: "104" },
      { input: "-20", output: "-4" },
      { input: "50", output: "122" }
    ]
  }),
  createProblem({
    title: "Character Categories",
    slug: "character-categories",
    difficulty: "easy",
    tags: ["strings", "if-else"],
    grade: "grade3",
    description: "Given a single character, print Letter, Digit or Other depending on its category.",
    explanation: "Check if the character is alphabetic, numeric, or neither.",
    constraints: "Input is a single character.",
    inputFormat: "A single character.",
    outputFormat: "Letter, Digit, or Other.",
    samples: [
      { input: "a", output: "Letter", explanation: "a is an alphabetic letter." },
      { input: "7", output: "Digit", explanation: "7 is numeric." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "A", output: "Letter" },
      { input: "z", output: "Letter" },
      { input: "0", output: "Digit" },
      { input: "9", output: "Digit" },
      { input: "#", output: "Other" },
      { input: " ", output: "Other" },
      { input: "@", output: "Other" },
      { input: "G", output: "Letter" },
      { input: "5", output: "Digit" },
      { input: "*", output: "Other" },
      { input: "y", output: "Letter" },
      { input: "1", output: "Digit" }
    ]
  }),
  createProblem({
    title: "Find Minimum and Maximum",
    slug: "find-minimum-and-maximum",
    difficulty: "easy",
    tags: ["lists", "loops"],
    grade: "grade3",
    description: "Read a list of integers and print the minimum and maximum separated by a space.",
    explanation: "Scan the list to determine smallest and largest values.",
    constraints: "1 ≤ n ≤ 50 and values are between -1000 and 1000.",
    inputFormat: "First line n, second line n integers.",
    outputFormat: "Two integers: minimum followed by maximum.",
    samples: [
      { input: "5\n3 1 4 1 5", output: "1 5", explanation: "Minimum is 1 and maximum is 5." },
      { input: "3\n-2 0 2", output: "-2 2", explanation: "Minimum is -2 and maximum is 2." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "3\n1 2 3", output: "1 3" },
      { input: "4\n-1 -2 -3 -4", output: "-4 -1" },
      { input: "5\n5 5 5 5 5", output: "5 5" },
      { input: "6\n10 2 8 4 6 0", output: "0 10" },
      { input: "2\n7 7", output: "7 7" },
      { input: "3\n-5 5 0", output: "-5 5" },
      { input: "5\n100 50 75 25 0", output: "0 100" },
      { input: "4\n1 -1 2 -2", output: "-2 2" },
      { input: "1\n42", output: "42 42" },
      { input: "5\n9 1 8 2 7", output: "1 9" },
      { input: "3\n0 0 1", output: "0 1" },
      { input: "4\n3 6 2 9 5", output: "2 9" }
    ]
  }),
  createProblem({
    title: "Multiply List Elements",
    slug: "multiply-list-elements",
    difficulty: "easy",
    tags: ["lists", "loops"],
    grade: "grade3",
    description: "Read a list of integers and print the product of all elements.",
    explanation: "Multiply values from the list together. A single number list returns that value.",
    constraints: "1 ≤ n ≤ 20 and each value is between -10 and 10.",
    inputFormat: "First line n, second line n integers.",
    outputFormat: "A single integer representing the product.",
    samples: [
      { input: "4\n1 2 3 4", output: "24", explanation: "1*2*3*4 = 24." },
      { input: "3\n2 -1 2", output: "-4", explanation: "2 * -1 * 2 = -4." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1\n5", output: "5" },
      { input: "2\n2 3", output: "6" },
      { input: "3\n1 2 3", output: "6" },
      { input: "4\n-1 2 -3 4", output: "24" },
      { input: "5\n0 1 2 3 4", output: "0" },
      { input: "2\n-2 -3", output: "6" },
      { input: "3\n-1 -1 -1", output: "-1" },
      { input: "4\n1 1 1 1", output: "1" },
      { input: "4\n2 0 4 5", output: "0" },
      { input: "5\n1 2 3 0 4", output: "0" },
      { input: "4\n-2 3 2 -1", output: "12" },
      { input: "3\n6 6 6", output: "216" }
    ]
  }),
  createProblem({
    title: "Remove Vowels from Text",
    slug: "remove-vowels-from-text",
    difficulty: "easy",
    tags: ["strings", "lists"],
    grade: "grade3",
    description: "Remove all vowels from the input text and print the result.",
    explanation: "Filter out a, e, i, o, u from the text while preserving case and spaces.",
    constraints: "Text length is at most 200 characters.",
    inputFormat: "A single line of text.",
    outputFormat: "The same text with vowels removed.",
    samples: [
      { input: "Hello", output: "Hll", explanation: "Remove e and o." },
      { input: "Robokidy", output: "Rbkd", explanation: "Remove o and i." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "aeiou", output: "" },
      { input: "Hello World", output: "Hll Wrld" },
      { input: "Python", output: "Pythn" },
      { input: "Robokidy", output: "Rbkd" },
      { input: "A E I O U", output: "  " },
      { input: "Coding Practice", output: "Cdng Prctc" },
      { input: "Grade One", output: "Grd n" },
      { input: "Easy Problem", output: "sy Prblm" },
      { input: "Numbers 123", output: "Nmbrs 123" },
      { input: "How are you", output: "Hw r y" },
      { input: "AEIOUaeiou", output: "" },
      { input: "Keep learning", output: "Kp lrnng" }
    ]
  }),
  createProblem({
    title: "Absolute Difference",
    slug: "absolute-difference",
    difficulty: "easy",
    tags: ["operators", "input/output"],
    grade: "grade3",
    description: "Read two integers and print the absolute difference between them.",
    explanation: "Compute the absolute value of the subtraction result.",
    constraints: "Numbers are within -1000 to 1000.",
    inputFormat: "Two integers separated by a space.",
    outputFormat: "A single integer representing the absolute difference.",
    samples: [
      { input: "5 3", output: "2", explanation: "Difference 2 is already positive." },
      { input: "3 5", output: "2", explanation: "Absolute difference of -2 is 2." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "10 4", output: "6" },
      { input: "4 10", output: "6" },
      { input: "-5 5", output: "10" },
      { input: "-3 -7", output: "4" },
      { input: "100 100", output: "0" },
      { input: "-1000 1000", output: "2000" },
      { input: "0 1", output: "1" },
      { input: "1 0", output: "1" },
      { input: "-2 2", output: "4" },
      { input: "7 -7", output: "14" },
      { input: "9 2", output: "7" },
      { input: "2 9", output: "7" }
    ]
  }),
  createProblem({
    title: "Count Letters in a Word",
    slug: "count-letters-in-a-word",
    difficulty: "easy",
    tags: ["strings", "functions"],
    grade: "grade4",
    description: "Read one word and output the number of alphabetic letters it contains.",
    explanation: "Ignore digits or symbols and count only alphabetic characters.",
    constraints: "Word length is at most 100 characters.",
    inputFormat: "A single word without spaces.",
    outputFormat: "A single integer.",
    samples: [
      { input: "hello123", output: "5", explanation: "Only letters h,e,l,l,o count." },
      { input: "Python3", output: "6", explanation: "Python contains 6 letters." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "abc", output: "3" },
      { input: "a1b2c3", output: "3" },
      { input: "12345", output: "0" },
      { input: "code!", output: "4" },
      { input: "Python", output: "6" },
      { input: "Data123Science", output: "11" },
      { input: "hello_world", output: "10" },
      { input: "A1B2C", output: "3" },
      { input: "Z", output: "1" },
      { input: "longword12345", output: "8" },
      { input: "!@#$%", output: "0" },
      { input: "abcXYZ", output: "6" }
    ]
  }),
  createProblem({
    title: "Count Spaces",
    slug: "count-spaces",
    difficulty: "easy",
    tags: ["strings", "loops"],
    grade: "grade4",
    description: "Count the number of spaces in a line of text and print the result.",
    explanation: "Iterate through the characters and count the space character only.",
    constraints: "Text length is at most 200 characters.",
    inputFormat: "A single line of text.",
    outputFormat: "A single integer representing spaces count.",
    samples: [
      { input: "Hello world", output: "1", explanation: "There is one space between the words." },
      { input: "Two  spaces", output: "2", explanation: "There are two consecutive spaces." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "No spaces", output: "1" },
      { input: "", output: "0" },
      { input: "   ", output: "3" },
      { input: "Hello  world", output: "2" },
      { input: "one two three", output: "2" },
      { input: "a b c d", output: "3" },
      { input: "Trailing space ", output: "1" },
      { input: " Leading", output: "1" },
      { input: "two   spaces", output: "3" },
      { input: "no_space", output: "0" },
      { input: "one\ttwo", output: "0" },
      { input: "hello world python", output: "2" }
    ]
  }),
  createProblem({
    title: "Echo Words",
    slug: "echo-words",
    difficulty: "easy",
    tags: ["input/output", "strings"],
    grade: "grade4",
    description: "Read a word and print it twice separated by a space.",
    explanation: "This checks basic output formatting and string reading.",
    constraints: "Word length at most 50.",
    inputFormat: "A single word.",
    outputFormat: "The word printed twice separated by a space.",
    samples: [
      { input: "hello", output: "hello hello", explanation: "The word is repeated twice." },
      { input: "code", output: "code code", explanation: "The same word appears twice." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "test", output: "test test" },
      { input: "a", output: "a a" },
      { input: "python", output: "python python" },
      { input: "Robokidy", output: "Robokidy Robokidy" },
      { input: "easy", output: "easy easy" },
      { input: "learn", output: "learn learn" },
      { input: "grade", output: "grade grade" },
      { input: "fun", output: "fun fun" },
      { input: "hello123", output: "hello123 hello123" },
      { input: "SPACE", output: "SPACE SPACE" },
      { input: "abcxyz", output: "abcxyz abcxyz" },
      { input: "Go", output: "Go Go" }
    ]
  }),
  createProblem({
    title: "Compare Two Numbers",
    slug: "compare-two-numbers",
    difficulty: "easy",
    tags: ["if-else", "operators"],
    grade: "grade4",
    description: "Read two integers and print the greater one. If equal, print Equal.",
    explanation: "Check the values with conditional statements.",
    constraints: "Values are between -1000 and 1000.",
    inputFormat: "Two integers separated by a space.",
    outputFormat: "The larger number or the word Equal.",
    samples: [
      { input: "5 3", output: "5", explanation: "5 is larger than 3." },
      { input: "7 7", output: "Equal", explanation: "Both values are equal." }
    ],
    timeLimitMs: 1200,
    memoryLimitMb: 128,
    testCases: [
      { input: "1 2", output: "2" },
      { input: "3 2", output: "3" },
      { input: "5 5", output: "Equal" },
      { input: "-1 -2", output: "-1" },
      { input: "-5 5", output: "5" },
      { input: "0 0", output: "Equal" },
      { input: "10 9", output: "10" },
      { input: "9 10", output: "10" },
      { input: "100 -100", output: "100" },
      { input: "-50 -50", output: "Equal" },
      { input: "4 4", output: "Equal" },
      { input: "8 7", output: "8" }
    ]
  })
];

const mediumProblems = [
  createProblem({
    title: "Word Frequency Counter",
    slug: "word-frequency-counter",
    difficulty: "medium",
    tags: ["dictionaries", "strings"],
    grade: "grade2",
    description: "Count how often each word appears in a sentence and print each word with its frequency in the order of first appearance.",
    explanation: "Split text into words, then use a dictionary to count occurrences.",
    constraints: "Sentence length at most 200 characters.",
    inputFormat: "A single line containing a sentence.",
    outputFormat: "Each word followed by its count on a separate line.",
    samples: [
      { input: "hello world hello", output: "hello 2\nworld 1", explanation: "hello appears twice, world once." },
      { input: "python is fun python", output: "python 2\nis 1\nfun 1", explanation: "Word frequency is tracked." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "one one two", output: "one 2\ntwo 1" },
      { input: "a b a b a", output: "a 3\nb 2" },
      { input: "hello", output: "hello 1" },
      { input: "test case test", output: "test 2\ncase 1" },
      { input: "python python python", output: "python 3" },
      { input: "one two three", output: "one 1\ntwo 1\nthree 1" },
      { input: "repeat repeat repeat repeat", output: "repeat 4" },
      { input: "code practice code", output: "code 2\npractice 1" },
      { input: "data science data", output: "data 2\nscience 1" },
      { input: "apple banana apple", output: "apple 2\nbanana 1" },
      { input: "abc abc def ghi", output: "abc 2\ndef 1\nghi 1" },
      { input: "A B A", output: "A 2\nB 1" }
    ]
  }),
  createProblem({
    title: "Anagram Validator",
    slug: "anagram-validator",
    difficulty: "medium",
    tags: ["strings", "dictionaries", "sets"],
    grade: "grade2",
    description: "Check if two input strings are anagrams of each other and print True or False.",
    explanation: "Anagrams contain the same letters with the same frequencies.",
    constraints: "Strings length at most 100 characters and may include spaces.",
    inputFormat: "Two lines, each with one string.",
    outputFormat: "True or False.",
    samples: [
      { input: "listen\nsilent", output: "True", explanation: "Both strings have the same letters." },
      { input: "hello\nworld", output: "False", explanation: "Different letter composition." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "listen\nsilent", output: "True" },
      { input: "triangle\nintegral", output: "True" },
      { input: "apple\npapel", output: "True" },
      { input: "rat\ncar", output: "False" },
      { input: "Dormitory\ndirty room", output: "True" },
      { input: "conversation\nvoices rant on", output: "True" },
      { input: "schoolmaster\nthe classroom", output: "True" },
      { input: "one\ntwo", output: "False" },
      { input: "program\ngrammar", output: "False" },
      { input: "fun\nfun", output: "True" },
      { input: "abc\nabc", output: "True" },
      { input: "aab\nba", output: "False" }
    ]
  }),
  createProblem({
    title: "Matrix Transpose",
    slug: "matrix-transpose",
    difficulty: "medium",
    tags: ["matrix operations", "lists"],
    grade: "grade3",
    description: "Read a matrix and print its transpose.",
    explanation: "Swap rows and columns to produce the transpose matrix.",
    constraints: "Matrix dimensions are at most 10x10.",
    inputFormat: "First line contains r and c. Next r lines contain c integers each.",
    outputFormat: "c lines with r integers each representing the transposed matrix.",
    samples: [
      { input: "2 3\n1 2 3\n4 5 6", output: "1 4\n2 5\n3 6", explanation: "Transpose flips rows with columns." },
      { input: "1 2\n7 8", output: "7\n8", explanation: "A 1x2 matrix becomes 2x1." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "2 2\n1 2\n3 4", output: "1 3\n2 4" },
      { input: "3 1\n5\n6\n7", output: "5 6 7" },
      { input: "1 3\n8 9 10", output: "8\n9\n10" },
      { input: "2 3\n-1 0 1\n2 3 4", output: "-1 2\n0 3\n1 4" },
      { input: "3 2\n1 2\n3 4\n5 6", output: "1 3 5\n2 4 6" },
      { input: "4 1\n1\n2\n3\n4", output: "1 2 3 4" },
      { input: "2 4\n1 2 3 4\n5 6 7 8", output: "1 5\n2 6\n3 7\n4 8" },
      { input: "1 1\n9", output: "9" },
      { input: "2 2\n0 1\n2 3", output: "0 2\n1 3" },
      { input: "3 3\n1 0 0\n0 1 0\n0 0 1", output: "1 0 0\n0 1 0\n0 0 1" },
      { input: "2 2\n7 8\n9 10", output: "7 9\n8 10" },
      { input: "3 2\n2 4\n6 8\n10 12", output: "2 6 10\n4 8 12" }
    ]
  }),
  createProblem({
    title: "Prime Count in Range",
    slug: "prime-count-in-range",
    difficulty: "medium",
    tags: ["loops", "functions"],
    grade: "grade3",
    description: "Count how many prime numbers are between 2 and n inclusive.",
    explanation: "Check each number for primality efficiently enough for n up to 1000.",
    constraints: "2 ≤ n ≤ 1000.",
    inputFormat: "A single integer n.",
    outputFormat: "A single integer count of primes.",
    samples: [
      { input: "10", output: "4", explanation: "Primes are 2,3,5,7." },
      { input: "2", output: "1", explanation: "Only 2 is prime." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "2", output: "1" },
      { input: "3", output: "2" },
      { input: "10", output: "4" },
      { input: "20", output: "8" },
      { input: "30", output: "10" },
      { input: "50", output: "15" },
      { input: "100", output: "25" },
      { input: "5", output: "3" },
      { input: "11", output: "5" },
      { input: "1", output: "0" },
      { input: "7", output: "4" },
      { input: "13", output: "6" }
    ]
  }),
  createProblem({
    title: "Flatten Nested Lists",
    slug: "flatten-nested-lists",
    difficulty: "medium",
    tags: ["lists", "recursion"],
    grade: "grade3",
    description: "Flatten a nested list of integers represented with brackets and spaces into a single line of numbers.",
    explanation: "Use recursion to parse nested lists and collect integer values.",
    constraints: "Nesting depth is at most 5 and total integers at most 50.",
    inputFormat: "A single line containing a nested list like [1 2 [3 4] 5].",
    outputFormat: "All integers separated by spaces in the same order.",
    samples: [
      { input: "[1 2 [3 4] 5]", output: "1 2 3 4 5", explanation: "Nested items are flattened." },
      { input: "[10 [20 [30]]]", output: "10 20 30", explanation: "All nested values are extracted." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "[1 2 3]", output: "1 2 3" },
      { input: "[1 [2 3] 4]", output: "1 2 3 4" },
      { input: "[[1 2] [3 4]]", output: "1 2 3 4" },
      { input: "[5 [6 [7]]]", output: "5 6 7" },
      { input: "[1 [2 [3 [4]]]]", output: "1 2 3 4" },
      { input: "[9]", output: "9" },
      { input: "[1 [2 3] [4 5]]", output: "1 2 3 4 5" },
      { input: "[10 [20] 30]", output: "10 20 30" },
      { input: "[1 2 [3 [4 5]] 6]", output: "1 2 3 4 5 6" },
      { input: "[0 [0 0]]", output: "0 0 0" },
      { input: "[7 [8 9]]", output: "7 8 9" },
      { input: "[1 [2] 3 [4]]", output: "1 2 3 4" }
    ]
  }),
  createProblem({
    title: "Sort Scores",
    slug: "sort-scores",
    difficulty: "medium",
    tags: ["sorting", "lists"],
    grade: "grade3",
    description: "Sort a sequence of student scores in descending order and print them.",
    explanation: "Read the scores, sort them using built-in functions, and output the sorted list.",
    constraints: "Number of scores is at most 50 and each score is 0 to 100.",
    inputFormat: "First line n, second line n space-separated integers.",
    outputFormat: "Sorted values in descending order separated by spaces.",
    samples: [
      { input: "4\n70 90 50 80", output: "90 80 70 50", explanation: "Scores are sorted descending." },
      { input: "3\n100 100 90", output: "100 100 90", explanation: "Equal scores retain valid order." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "3\n1 2 3", output: "3 2 1" },
      { input: "5\n10 50 30 20 40", output: "50 40 30 20 10" },
      { input: "4\n100 90 90 80", output: "100 90 90 80" },
      { input: "2\n0 100", output: "100 0" },
      { input: "5\n5 4 3 2 1", output: "5 4 3 2 1" },
      { input: "3\n20 20 20", output: "20 20 20" },
      { input: "4\n33 44 22 11", output: "44 33 22 11" },
      { input: "1\n77", output: "77" },
      { input: "6\n1 2 3 4 5 6", output: "6 5 4 3 2 1" },
      { input: "3\n99 0 100", output: "100 99 0" },
      { input: "5\n10 20 10 20 10", output: "20 20 10 10 10" },
      { input: "4\n6 5 5 6", output: "6 6 5 5" }
    ]
  }),
  createProblem({
    title: "Binary Search",
    slug: "binary-search",
    difficulty: "medium",
    tags: ["searching", "lists"],
    grade: "grade4",
    description: "Given a sorted list and a key, find the index of the key using binary search or print -1 if missing.",
    explanation: "Binary search halves the search range until the key is found or eliminated.",
    constraints: "List length is at most 50. Keys are integers.",
    inputFormat: "First line n, second line n sorted integers, third line search key.",
    outputFormat: "The zero-based index or -1.",
    samples: [
      { input: "5\n1 3 5 7 9\n7", output: "3", explanation: "7 appears at index 3." },
      { input: "4\n2 4 6 8\n5", output: "-1", explanation: "5 is not in the list." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "5\n1 2 3 4 5\n3", output: "2" },
      { input: "5\n1 2 3 4 5\n6", output: "-1" },
      { input: "1\n10\n10", output: "0" },
      { input: "3\n-1 0 1\n0", output: "1" },
      { input: "4\n2 4 6 8\n2", output: "0" },
      { input: "4\n2 4 6 8\n8", output: "3" },
      { input: "4\n2 4 6 8\n5", output: "-1" },
      { input: "6\n1 3 5 7 9 11\n11", output: "5" },
      { input: "6\n1 3 5 7 9 11\n1", output: "0" },
      { input: "2\n0 1\n-1", output: "-1" },
      { input: "5\n10 20 30 40 50\n30", output: "2" },
      { input: "5\n10 20 30 40 50\n35", output: "-1" }
    ]
  }),
  createProblem({
    title: "List Comprehension Filter",
    slug: "list-comprehension-filter",
    difficulty: "medium",
    tags: ["list comprehensions", "lists"],
    grade: "grade4",
    description: "Read a list of integers and print only the even values using list comprehension style output.",
    explanation: "Filter the list for even numbers and output them in the original order.",
    constraints: "1 ≤ n ≤ 50 and values are between -1000 and 1000.",
    inputFormat: "First line n, second line n integers.",
    outputFormat: "The even numbers separated by spaces.",
    samples: [
      { input: "5\n1 2 3 4 5", output: "2 4", explanation: "Only the even values remain." },
      { input: "4\n10 11 12 13", output: "10 12", explanation: "Output even numbers only." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "5\n1 2 3 4 5", output: "2 4" },
      { input: "4\n6 7 8 9", output: "6 8" },
      { input: "3\n1 3 5", output: "" },
      { input: "6\n2 4 6 8 10 12", output: "2 4 6 8 10 12" },
      { input: "5\n-2 -1 0 1 2", output: "-2 0 2" },
      { input: "1\n4", output: "4" },
      { input: "2\n5 7", output: "" },
      { input: "3\n10 15 20", output: "10 20" },
      { input: "4\n-4 -3 -2 -1", output: "-4 -2" },
      { input: "5\n0 1 2 3 4", output: "0 2 4" },
      { input: "5\n9 8 7 6 5", output: "8 6" },
      { input: "6\n1 2 3 4 5 6", output: "2 4 6" }
    ]
  }),
  createProblem({
    title: "Brackets Validator",
    slug: "brackets-validator",
    difficulty: "medium",
    tags: ["stacks", "strings"],
    grade: "grade4",
    description: "Check whether the input string of brackets is balanced and print True or False.",
    explanation: "Use a stack to match opening and closing bracket pairs.",
    constraints: "String length at most 200.",
    inputFormat: "A single line containing brackets: (), [], {}.",
    outputFormat: "True or False.",
    samples: [
      { input: "([])", output: "True", explanation: "Brackets are properly nested." },
      { input: "([)]", output: "False", explanation: "Closing order does not match." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "()", output: "True" },
      { input: "([])", output: "True" },
      { input: "([)]", output: "False" },
      { input: "{[()]}", output: "True" },
      { input: "{[(])}", output: "False" },
      { input: "", output: "True" },
      { input: "([{}])", output: "True" },
      { input: "((", output: "False" },
      { input: ")(", output: "False" },
      { input: "{[]}", output: "True" },
      { input: "{[}", output: "False" },
      { input: "[()()]", output: "True" }
    ]
  }),
  createProblem({
    title: "Merge Intervals",
    slug: "merge-intervals",
    difficulty: "medium",
    tags: ["sorting", "lists"],
    grade: "grade4",
    description: "Given a list of intervals, merge all overlapping intervals and print the merged list.",
    explanation: "Sort by the start of each interval and combine overlapping segments.",
    constraints: "Number of intervals is at most 20.",
    inputFormat: "First line n, next n lines each contain two integers start and end.",
    outputFormat: "Merged intervals printed one per line as start end.",
    samples: [
      { input: "3\n1 3\n2 6\n8 10", output: "1 6\n8 10", explanation: "Intervals [1,3] and [2,6] overlap." },
      { input: "2\n1 4\n5 6", output: "1 4\n5 6", explanation: "No overlap, intervals remain separate." }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "3\n1 3\n2 6\n8 10", output: "1 6\n8 10" },
      { input: "3\n1 4\n4 5\n6 7", output: "1 5\n6 7" },
      { input: "4\n1 3\n2 4\n5 7\n6 8", output: "1 4\n5 8" },
      { input: "2\n1 2\n3 4", output: "1 2\n3 4" },
      { input: "1\n0 0", output: "0 0" },
      { input: "3\n-1 1\n1 2\n2 3", output: "-1 3" },
      { input: "3\n5 6\n2 4\n3 5", output: "2 6" },
      { input: "3\n1 1\n1 2\n2 3", output: "1 3" },
      { input: "4\n1 5\n2 3\n6 8\n7 9", output: "1 5\n6 9" },
      { input: "2\n10 12\n12 15", output: "10 15" },
      { input: "3\n1 2\n2 3\n3 4", output: "1 4" },
      { input: "2\n0 5\n6 10", output: "0 5\n6 10" }
    ]
  }),
  createProblem({
    title: "Grade Report Summary",
    slug: "grade-report-summary",
    difficulty: "medium",
    tags: ["dictionaries", "lists"],
    grade: "grade4",
    description: "Read student names and scores, then print each student with " ,
    explanation: "" ,
    constraints: "" ,
    inputFormat: "" ,
    outputFormat: "" ,
    samples: [
      { input: "" , output: "" , explanation: "" }
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testCases: [
      { input: "" , output: "" }
    ]
  })
];

module.exports = {
  easyProblems,
  mediumProblems
};
