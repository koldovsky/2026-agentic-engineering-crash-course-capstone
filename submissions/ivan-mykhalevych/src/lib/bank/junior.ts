import type { Question } from "../types";

export const JUNIOR_QUESTIONS: Question[] = [
  {
    id: "j1",
    level: "junior",
    topic: "Strings",
    text: "What does == compare when applied to two String variables?",
    options: [
      "The characters of both strings",
      "The lengths of both strings",
      "The object references of both",
      "The hash codes of both strings",
    ],
    correctIndex: 2,
    explanation:
      "== compares references. Use equals() to compare the characters; two equal strings may still be different objects.",
  },
  {
    id: "j2",
    level: "junior",
    topic: "OOP",
    text: "Which keyword prevents a class from being extended?",
    options: [
      "static",
      "native",
      "abstract",
      "final",
    ],
    correctIndex: 3,
    explanation:
      "A final class cannot be subclassed. An abstract class, by contrast, exists only to be extended.",
  },
  {
    id: "j3",
    level: "junior",
    topic: "Basics",
    text: "What is the default value of an int instance field?",
    options: [
      "Null, like objects",
      "Minus one",
      "Not a number (NaN)",
      "The number zero",
    ],
    correctIndex: 3,
    explanation:
      "Instance fields get default values: 0 for int, false for boolean, null for references. Local variables get none.",
  },
  {
    id: "j4",
    level: "junior",
    topic: "Collections",
    text: "Which operation is O(1) on an ArrayList but O(n) on a LinkedList?",
    options: [
      "Reading an item by index",
      "Inserting an item at the head",
      "Removing the very first item",
      "Inserting in the middle",
    ],
    correctIndex: 0,
    explanation:
      "ArrayList is backed by an array, so get(index) is O(1), while a LinkedList must walk the nodes. Adding or removing at the head is the reverse: O(1) on a LinkedList but O(n) on an ArrayList.",
  },
  {
    id: "j5",
    level: "junior",
    topic: "Basics",
    text: "What does the static modifier on a method mean?",
    options: [
      "It can only be called from main",
      "It runs once at program startup time",
      "It belongs to the class, not objects",
      "It is only visible inside its package",
    ],
    correctIndex: 2,
    explanation:
      "A static method is called on the class itself and has no this reference, so it cannot use instance fields directly.",
  },
  {
    id: "j6",
    level: "junior",
    topic: "Collections",
    text: "Which of these collections does not allow duplicate elements?",
    options: [
      "ArrayList",
      "HashSet",
      "LinkedList",
      "ArrayDeque",
    ],
    correctIndex: 1,
    explanation:
      "A Set rejects duplicates, as decided by equals() and hashCode(). Lists and deques accept repeated elements.",
  },
  {
    id: "j7",
    level: "junior",
    topic: "Strings",
    text: "What happens when you call toUpperCase() on a String?",
    options: [
      "It modifies the original string in place",
      "It throws an UnsupportedOperationException",
      "It returns a new uppercase String",
      "It converts only the first character",
    ],
    correctIndex: 2,
    explanation:
      "Strings are immutable. Methods such as toUpperCase() return a new String and leave the original unchanged.",
  },
  {
    id: "j8",
    level: "junior",
    topic: "Basics",
    text: "What is the correct signature of the standard main method?",
    options: [
      "public static void main(String args)",
      "static public int main(String[] args)",
      "public static void main(String[] args)",
      "public static main(String[] args)",
    ],
    correctIndex: 2,
    explanation:
      "The classic entry point is public static void main(String[] args). Newer Java versions also allow simplified instance main methods, but this form works everywhere.",
  },
  {
    id: "j9",
    level: "junior",
    topic: "OOP",
    text: "What is method overloading?",
    options: [
      "Same name, different parameter lists",
      "Calling a method from itself",
      "Same signature in a subclass",
      "Hiding a method with a field",
    ],
    correctIndex: 0,
    explanation:
      "Overloading means several methods share a name but differ in parameters. Redefining an inherited method with the same signature is overriding.",
  },
  {
    id: "j10",
    level: "junior",
    topic: "Basics",
    text: "What does the break statement do inside a loop?",
    options: [
      "Skips to the next iteration",
      "Restarts the loop from zero",
      "Exits the nearest enclosing loop",
      "Stops the whole program run",
    ],
    correctIndex: 2,
    explanation:
      "break leaves the innermost loop (or switch). continue is the statement that skips to the next iteration.",
  },
  {
    id: "j11",
    level: "junior",
    topic: "Strings",
    text: "What does this code print?",
    code: `String a = "hi";
String b = new String("hi");
System.out.println(a == b);
System.out.println(a.equals(b));`,
    options: [
      "true and true",
      "false and true",
      "true and false",
      "false and false",
    ],
    correctIndex: 1,
    explanation:
      "new String(\"hi\") creates a separate object, so == (reference comparison) is false, while equals() compares the characters and is true.",
  },
  {
    id: "j12",
    level: "junior",
    topic: "Basics",
    text: "What does this code print?",
    code: `int result = 7 / 2;
System.out.println(result);`,
    options: [
      "It prints 3.5",
      "It prints 4",
      "It does not compile",
      "It prints 3",
    ],
    correctIndex: 3,
    explanation:
      "Dividing two ints gives an int: the fractional part is dropped, so 7 / 2 is 3. Use 7 / 2.0 to get 3.5.",
  },
  {
    id: "j13",
    level: "junior",
    topic: "Basics",
    text: "Which of these is not a primitive type in Java?",
    options: [
      "double",
      "String",
      "boolean",
      "char",
    ],
    correctIndex: 1,
    explanation:
      "String is a class, so it is a reference type. The eight primitives are byte, short, int, long, float, double, boolean and char.",
  },
  {
    id: "j14",
    level: "junior",
    topic: "Basics",
    text: "What is the size of an int in Java?",
    options: [
      "Always exactly 32 bits",
      "Always 16 bits",
      "Always 64 bits",
      "Depends on the CPU",
    ],
    correctIndex: 0,
    explanation:
      "Java fixes the size of its primitive types, so an int is 32 bits on every platform.",
  },
  {
    id: "j15",
    level: "junior",
    topic: "Basics",
    text: "What does the final keyword mean on a local variable?",
    options: [
      "It is stored only in the heap",
      "It can be assigned only one time",
      "It is shared by all threads",
      "It is hidden from subclasses",
    ],
    correctIndex: 1,
    explanation:
      "A final variable can be assigned exactly once. For a final reference, the reference cannot change, but the object it points to still can.",
  },
  {
    id: "j16",
    level: "junior",
    topic: "OOP",
    text: "What is encapsulation?",
    options: [
      "Hiding state behind methods",
      "Creating a class from another",
      "Giving one method many forms",
      "Splitting code into packages",
    ],
    correctIndex: 0,
    explanation:
      "Encapsulation keeps fields private and exposes behaviour through methods, so the class controls how its state changes.",
  },
  {
    id: "j17",
    level: "junior",
    topic: "OOP",
    text: "Which relationship does the extends keyword express?",
    options: [
      "A has-a relationship",
      "A uses-a relationship",
      "A static relationship",
      "An is-a (inheritance) relationship",
    ],
    correctIndex: 3,
    explanation:
      "A subclass is a kind of its superclass, which is the is-a relationship. Holding another object in a field is a has-a relationship.",
  },
  {
    id: "j18",
    level: "junior",
    topic: "OOP",
    text: "Can a Java class extend more than one class?",
    options: [
      "No, it has single inheritance",
      "Yes, with extends written twice",
      "Yes, but only abstract classes",
      "No, unless the classes are final",
    ],
    correctIndex: 0,
    explanation:
      "A class has exactly one superclass. Multiple behaviour comes from implementing several interfaces.",
  },
  {
    id: "j19",
    level: "junior",
    topic: "OOP",
    text: "How many interfaces can a class implement?",
    options: [
      "Exactly one interface",
      "At most two interfaces in total",
      "Any number of interfaces",
      "None, only subclasses can",
    ],
    correctIndex: 2,
    explanation:
      "A class may implement as many interfaces as it needs, separated by commas after implements.",
  },
  {
    id: "j20",
    level: "junior",
    topic: "Collections",
    text: "Which collection keeps insertion order and allows duplicates?",
    options: [
      "LinkedHashSet",
      "ArrayList",
      "HashSet",
      "TreeSet",
    ],
    correctIndex: 1,
    explanation:
      "A List keeps elements in the order they were added and allows repeats. LinkedHashSet keeps the order too, but a Set rejects duplicates.",
  },
  {
    id: "j21",
    level: "junior",
    topic: "Collections",
    text: "What does HashMap.get() return for a missing key?",
    options: [
      "It returns zero",
      "It returns false",
      "It throws an error",
      "It returns null (no exception)",
    ],
    correctIndex: 3,
    explanation:
      "get() returns null when the key is absent. containsKey() tells a missing key apart from a key that is mapped to null.",
  },
  {
    id: "j22",
    level: "junior",
    topic: "Collections",
    text: "Which interface represents key-value pairs?",
    options: [
      "List",
      "Map",
      "Set",
      "Queue",
    ],
    correctIndex: 1,
    explanation:
      "A Map stores values by key. List, Set and Queue are collections of single elements.",
  },
  {
    id: "j23",
    level: "junior",
    topic: "Collections",
    text: "How do you get the number of elements in an ArrayList?",
    options: [
      "list.length",
      "list.count()",
      "list.size()",
      "list.length()",
    ],
    correctIndex: 2,
    explanation:
      "Collections expose their element count through size(). length is a field of arrays and length() belongs to String.",
  },
  {
    id: "j24",
    level: "junior",
    topic: "Strings",
    text: "Which String method compares two strings ignoring case?",
    options: [
      "equalsIgnoreCase()",
      "compareIgnoreCase()",
      "equalsNoCase()",
      "isEqualIgnoreCase()",
    ],
    correctIndex: 0,
    explanation:
      "equalsIgnoreCase() compares the characters ignoring letter case. compareToIgnoreCase() also exists, but it returns an int ordering.",
  },
  {
    id: "j25",
    level: "junior",
    topic: "Strings",
    text: "How do you get the first character of a String s?",
    options: [
      "s.getChar(0)",
      "s.charAt(0)",
      "s.charAt(1)",
      "s.char(0)",
    ],
    correctIndex: 1,
    explanation:
      "charAt(index) returns the char at a zero-based position, so the first character is at index 0.",
  },
  {
    id: "j26",
    level: "junior",
    topic: "Strings",
    text: "Which approach is best for building a long string in a loop?",
    options: [
      "A String with += each time",
      "A String array",
      "A StringBuilder",
      "A char constant",
    ],
    correctIndex: 2,
    explanation:
      "Strings are immutable, so += creates a new object on every pass. A StringBuilder appends into one growing buffer.",
  },
  {
    id: "j27",
    level: "junior",
    topic: "Exceptions",
    text: "Which block always runs after try, even if an exception is thrown?",
    options: [
      "catch",
      "throws",
      "default",
      "finally",
    ],
    correctIndex: 3,
    explanation:
      "The finally block runs whether or not an exception happens, which makes it the place to release resources.",
  },
  {
    id: "j28",
    level: "junior",
    topic: "Exceptions",
    text: "Which keyword throws an exception object?",
    options: [
      "raise",
      "throw",
      "throws",
      "catch",
    ],
    correctIndex: 1,
    explanation:
      "throw raises an exception object. throws is only part of a method declaration that lists exceptions it may throw.",
  },
  {
    id: "j29",
    level: "junior",
    topic: "Exceptions",
    text: "What happens if an exception is not caught anywhere?",
    options: [
      "The JVM retries the failed statement",
      "The thread ends with a stack trace",
      "The exception is silently ignored",
      "The program continues with a null value",
    ],
    correctIndex: 1,
    explanation:
      "An uncaught exception terminates the thread that threw it, and the default handler prints the stack trace.",
  },
  {
    id: "j30",
    level: "junior",
    topic: "Basics",
    text: "What does JVM stand for?",
    options: [
      "Java Variable Method",
      "Java Version Manager",
      "Joint Verification Module",
      "Java Virtual Machine",
    ],
    correctIndex: 3,
    explanation:
      "The Java Virtual Machine runs compiled bytecode, which is why the same program can run on different operating systems.",
  },
  {
    id: "j31",
    level: "junior",
    topic: "Basics",
    text: "Which loop always runs its body at least once?",
    options: [
      "A do-while loop",
      "A for loop",
      "A while loop",
      "A for-each loop",
    ],
    correctIndex: 0,
    explanation:
      "A do-while loop checks its condition after the body, so the body runs at least once.",
  },
  {
    id: "j32",
    level: "junior",
    topic: "Basics",
    text: "What is the result of 10 % 3 in Java?",
    options: [
      "It is 0",
      "It is 3",
      "It is 1",
      "It is 3.33",
    ],
    correctIndex: 2,
    explanation:
      "% is the remainder operator. 10 divided by 3 leaves a remainder of 1.",
  },
  {
    id: "j33",
    level: "junior",
    topic: "Basics",
    text: "Which operator is true only when both conditions are true?",
    options: [
      "The || operator",
      "The ! operator",
      "The logical && operator",
      "The == operator",
    ],
    correctIndex: 2,
    explanation:
      "&& is the logical AND. || is OR and ! negates a boolean.",
  },
  {
    id: "j34",
    level: "junior",
    topic: "Basics",
    text: "What does the continue statement do in a loop?",
    options: [
      "Ends the whole loop right away",
      "Restarts the whole program",
      "Jumps out of the method",
      "Skips to the next iteration",
    ],
    correctIndex: 3,
    explanation:
      "continue skips the rest of the current iteration and moves on to the next one. break is the statement that leaves the loop.",
  },
  {
    id: "j35",
    level: "junior",
    topic: "JVM",
    text: "Where are the local variables of a method stored?",
    options: [
      "On the stack",
      "On the heap",
      "In the string pool",
      "In the metaspace",
    ],
    correctIndex: 0,
    explanation:
      "Each method call gets a stack frame that holds its local variables. Objects live on the heap, and a local variable only holds a reference to them.",
  },
  {
    id: "j36",
    level: "junior",
    topic: "JVM",
    text: "What does the garbage collector do?",
    options: [
      "Frees objects that are unreachable",
      "Loads classes from the file system",
      "Compiles bytecode into machine code",
      "Checks the syntax before a run",
    ],
    correctIndex: 0,
    explanation:
      "The garbage collector reclaims the memory of objects that no live reference can reach any more.",
  },
  {
    id: "j37",
    level: "junior",
    topic: "Basics",
    text: "What does the Java compiler javac produce from a .java file?",
    options: [
      "A .java file with source",
      "An .exe file with machine code",
      "A .txt file with a log",
      "A .class file with bytecode",
    ],
    correctIndex: 3,
    explanation:
      "javac compiles source into bytecode stored in .class files, which the JVM then loads and runs.",
  },
  {
    id: "j38",
    level: "junior",
    topic: "OOP",
    text: "What does this refer to inside an instance method?",
    options: [
      "The superclass object",
      "The current instance object",
      "The static context",
      "The calling thread",
    ],
    correctIndex: 1,
    explanation:
      "this is a reference to the object on which the method was called.",
  },
  {
    id: "j39",
    level: "junior",
    topic: "Strings",
    text: "What does the trim() method of a String do?",
    options: [
      "Deletes every space in the text",
      "Cuts the string in half",
      "Converts it to lowercase",
      "Removes spaces at both ends",
    ],
    correctIndex: 3,
    explanation:
      "trim() returns a copy without leading and trailing whitespace. Spaces inside the text stay.",
  },
  {
    id: "j40",
    level: "junior",
    topic: "Collections",
    text: "What happens when you add a duplicate to a HashSet?",
    options: [
      "add() returns false",
      "The old element is replaced",
      "An exception is thrown",
      "The element is stored twice",
    ],
    correctIndex: 0,
    explanation:
      "A Set keeps one copy. add() leaves the set unchanged and returns false when the element is already present.",
  },
];
