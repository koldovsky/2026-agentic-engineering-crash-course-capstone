import type { Question } from "../types";

export const MIDDLE_QUESTIONS: Question[] = [
  {
    id: "m1",
    level: "middle",
    topic: "Collections",
    text: "Two different keys in a HashMap have the same hashCode(). What happens?",
    options: [
      "Both share a bucket; equals() decides",
      "The second put throws an error",
      "The first entry is overwritten",
      "The map rehashes until they differ",
    ],
    correctIndex: 0,
    explanation:
      "Colliding keys are stored in the same bucket (a list, or a tree when long). equals() is used to tell them apart.",
  },
  {
    id: "m2",
    level: "middle",
    topic: "Exceptions",
    text: "Which of these is a checked exception?",
    options: [
      "NullPointerException",
      "IllegalStateException",
      "FileNotFoundException",
      "ClassCastException",
    ],
    correctIndex: 2,
    explanation:
      "FileNotFoundException extends IOException, so it is checked: the compiler forces you to handle or declare it. The others are RuntimeExceptions.",
  },
  {
    id: "m3",
    level: "middle",
    topic: "Concurrency",
    text: "What does the volatile keyword guarantee for a field?",
    options: [
      "Atomic updates for compound operations",
      "Mutual exclusion between all threads",
      "That the value is never cached at all",
      "Visibility of writes to other threads",
    ],
    correctIndex: 3,
    explanation:
      "volatile gives visibility and ordering, not atomicity: count++ on a volatile field is still a race.",
  },
  {
    id: "m4",
    level: "middle",
    topic: "Streams",
    text: "When does the filter() step of a Java stream actually run?",
    options: [
      "Only when a terminal operation is called",
      "Immediately when filter() is invoked",
      "When the stream is first created",
      "On a separate thread right away",
    ],
    correctIndex: 0,
    explanation:
      "Intermediate operations are lazy. Nothing is processed until a terminal operation such as collect() or forEach().",
  },
  {
    id: "m5",
    level: "middle",
    topic: "OOP",
    text: "Which statement about interfaces since Java 8 is true?",
    options: [
      "They cannot declare any constants",
      "They can hold instance fields",
      "They can have default methods",
      "They must have a public constructor",
    ],
    correctIndex: 2,
    explanation:
      "Java 8 added default and static methods to interfaces. Interfaces still cannot hold instance state or constructors.",
  },
  {
    id: "m6",
    level: "middle",
    topic: "Collections",
    text: "Which Map implementation keeps its keys in sorted order?",
    options: [
      "Hashtable",
      "LinkedHashMap",
      "TreeMap",
      "WeakHashMap",
    ],
    correctIndex: 2,
    explanation:
      "TreeMap keeps keys sorted by natural order or a Comparator. LinkedHashMap keeps insertion order, and HashMap makes no ordering promise.",
  },
  {
    id: "m7",
    level: "middle",
    topic: "Exceptions",
    text: "What does a try-with-resources statement do?",
    options: [
      "Closes the resources automatically",
      "Retries the block until it succeeds",
      "Catches every exception silently",
      "Runs the block on another thread",
    ],
    correctIndex: 0,
    explanation:
      "Resources that implement AutoCloseable are closed automatically when the block ends, even if an exception is thrown.",
  },
  {
    id: "m8",
    level: "middle",
    topic: "OOP",
    text: "What is the contract between equals() and hashCode()?",
    options: [
      "Equal hash codes imply equal objects",
      "hashCode() must be unique per object",
      "Equal objects must have equal hash codes",
      "They must be overridden separately",
    ],
    correctIndex: 2,
    explanation:
      "If a.equals(b) is true, both must return the same hashCode(). The reverse is not required: different objects may collide.",
  },
  {
    id: "m9",
    level: "middle",
    topic: "Generics",
    text: "What does type erasure mean for Java generics?",
    options: [
      "Types are checked only at runtime",
      "Primitive types are boxed automatically",
      "Generics are replaced by Object fields",
      "Type arguments vanish after compilation",
    ],
    correctIndex: 3,
    explanation:
      "The compiler checks generic types and then erases them, so at runtime a List<String> and a List<Integer> are the same class.",
  },
  {
    id: "m10",
    level: "middle",
    topic: "Concurrency",
    text: "How does Callable differ from Runnable?",
    options: [
      "Runnable is only for daemon threads",
      "Callable cannot be used with executors",
      "Runnable always runs in a thread pool",
      "Callable returns a result and can throw",
    ],
    correctIndex: 3,
    explanation:
      "Callable.call() returns a value and may throw checked exceptions. Runnable.run() returns nothing and cannot throw checked exceptions.",
  },
  {
    id: "m11",
    level: "middle",
    topic: "Collections",
    text: "What happens when this code runs?",
    code: `List<String> names = new ArrayList<>(List.of("a", "b", "c"));
for (String name : names) {
    names.add("d");
}`,
    options: [
      "It loops forever adding items until memory runs out",
      "It throws a ConcurrentModificationException",
      "It does not compile at all",
      "It adds d three times and ends",
    ],
    correctIndex: 1,
    explanation:
      "Structurally modifying an ArrayList while iterating over it makes the iterator fail fast with a ConcurrentModificationException on its next step.",
  },
  {
    id: "m12",
    level: "middle",
    topic: "Basics",
    text: "What does this code print?",
    code: `Integer a = 127;
Integer b = 127;
Integer c = 128;
Integer d = 128;
System.out.println((a == b) + " " + (c == d));`,
    options: [
      "true false",
      "true true",
      "false true",
      "false false",
    ],
    correctIndex: 0,
    explanation:
      "Boxing caches Integer objects from -128 to 127 by default, so a == b is true, but 128 creates two separate objects and c == d is false. Compare boxed values with equals().",
  },
  {
    id: "m13",
    level: "middle",
    topic: "Collections",
    text: "What is the average time complexity of HashMap.get()?",
    options: [
      "Constant time",
      "Linear scan time",
      "Logarithmic time",
      "Quadratic time",
    ],
    correctIndex: 0,
    explanation:
      "A hash lookup jumps straight to a bucket, so the average cost is O(1). Heavy collisions can slow it down.",
  },
  {
    id: "m14",
    level: "middle",
    topic: "Collections",
    text: "When does a HashMap grow its table?",
    options: [
      "When any key is removed",
      "When it is iterated twice",
      "When size passes the load threshold",
      "When a lookup finds nothing",
    ],
    correctIndex: 2,
    explanation:
      "A HashMap doubles its table when the number of entries exceeds capacity times the load factor, 0.75 by default.",
  },
  {
    id: "m15",
    level: "middle",
    topic: "Collections",
    text: "How does a Comparator differ from Comparable?",
    options: [
      "Comparable can only compare Strings",
      "A Comparator must be implemented by the class itself",
      "They are two names for one interface",
      "A Comparator defines order outside the class",
    ],
    correctIndex: 3,
    explanation:
      "A class implements Comparable to define its natural order via compareTo(). A Comparator is a separate object passed to a sort method to define another order.",
  },
  {
    id: "m16",
    level: "middle",
    topic: "Collections",
    text: "What does Collections.unmodifiableList(list) return?",
    options: [
      "A deep copy of the list",
      "A read-only view of the same list",
      "A copy that is safe for many threads",
      "A list sorted in natural order",
    ],
    correctIndex: 1,
    explanation:
      "It wraps the original list in a view that rejects changes. The view still reflects later changes made to the original list.",
  },
  {
    id: "m17",
    level: "middle",
    topic: "Collections",
    text: "In which order does a HashSet iterate its elements?",
    options: [
      "Insertion order",
      "No guaranteed order",
      "Sorted order",
      "Reverse insertion order",
    ],
    correctIndex: 1,
    explanation:
      "A HashSet makes no ordering promise. Use LinkedHashSet for insertion order or TreeSet for sorted order.",
  },
  {
    id: "m18",
    level: "middle",
    topic: "Collections",
    text: "What does List.of(1, 2, 3) return?",
    options: [
      "A growable ArrayList",
      "A synchronized list",
      "An unmodifiable list",
      "A sorted LinkedList",
    ],
    correctIndex: 2,
    explanation:
      "List.of creates an unmodifiable list: add and remove throw UnsupportedOperationException.",
  },
  {
    id: "m19",
    level: "middle",
    topic: "Streams",
    text: "Which of these is a terminal stream operation?",
    options: [
      "forEach()",
      "peek()",
      "map()",
      "distinct()",
    ],
    correctIndex: 0,
    explanation:
      "forEach() consumes the stream and ends the pipeline. The others are intermediate operations that return another stream.",
  },
  {
    id: "m20",
    level: "middle",
    topic: "Streams",
    text: "What does flatMap do on a stream?",
    options: [
      "Merges inner streams into one stream",
      "Removes duplicates from the stream",
      "Reverses the order of elements",
      "Counts the matching elements",
    ],
    correctIndex: 0,
    explanation:
      "flatMap maps each element to a stream and then flattens all of those streams into a single stream.",
  },
  {
    id: "m21",
    level: "middle",
    topic: "Streams",
    text: "What is Optional mainly used for?",
    options: [
      "Declaring optional method parameters",
      "Making fields thread-safe",
      "Wrapping a possibly absent value",
      "Replacing all if statements",
    ],
    correctIndex: 2,
    explanation:
      "Optional makes the absence of a result explicit in a return type. It is not intended for fields or parameters.",
  },
  {
    id: "m22",
    level: "middle",
    topic: "Generics",
    text: "Why can't you write new T() inside a generic class?",
    options: [
      "T must be an interface",
      "T is erased at runtime",
      "T is always abstract",
      "new needs a final class",
    ],
    correctIndex: 1,
    explanation:
      "Because of type erasure the JVM does not know what T is at runtime, so it cannot create an instance of it.",
  },
  {
    id: "m23",
    level: "middle",
    topic: "Generics",
    text: "What does List<?> mean?",
    options: [
      "A list of Object only",
      "A list of any one type",
      "An always empty list",
      "A list of String values",
    ],
    correctIndex: 1,
    explanation:
      "An unbounded wildcard means a list of some unknown element type. You can read elements as Object but you cannot add to it.",
  },
  {
    id: "m24",
    level: "middle",
    topic: "Exceptions",
    text: "Which exception does an invalid cast throw?",
    options: [
      "NumberFormatException",
      "IllegalCastException",
      "TypeMismatchException",
      "ClassCastException",
    ],
    correctIndex: 3,
    explanation:
      "Casting an object to an incompatible class throws ClassCastException at runtime.",
  },
  {
    id: "m25",
    level: "middle",
    topic: "Exceptions",
    text: "What does the throws clause of a method do?",
    options: [
      "Handles exceptions in the method body",
      "Declares exceptions the method may throw",
      "Stops exceptions from being created",
      "Turns checked errors into unchecked",
    ],
    correctIndex: 1,
    explanation:
      "throws is part of the method signature and tells callers which exceptions they must handle or declare.",
  },
  {
    id: "m26",
    level: "middle",
    topic: "Concurrency",
    text: "What does a synchronized instance method lock?",
    options: [
      "The monitor of the Class object",
      "The monitor of this object",
      "Only the calling thread",
      "Every object of the class",
    ],
    correctIndex: 1,
    explanation:
      "A synchronized instance method locks this. A static synchronized method locks the Class object instead.",
  },
  {
    id: "m27",
    level: "middle",
    topic: "Concurrency",
    text: "What is a race condition?",
    options: [
      "Outcome depends on thread timing",
      "Two threads waiting for each other forever",
      "A thread that runs too slowly",
      "A lock that is held too long",
    ],
    correctIndex: 0,
    explanation:
      "A race condition means the result changes depending on how threads happen to interleave. Threads waiting on each other forever is a deadlock.",
  },
  {
    id: "m28",
    level: "middle",
    topic: "Concurrency",
    text: "Why use a thread pool instead of creating a new Thread for every task?",
    options: [
      "It makes every single task run faster",
      "It removes the need for locks",
      "It guarantees tasks finish in order",
      "It reuses threads and limits their number",
    ],
    correctIndex: 3,
    explanation:
      "A pool reuses a bounded set of threads, which avoids the cost of creating threads and protects the machine from too many of them.",
  },
  {
    id: "m29",
    level: "middle",
    topic: "Concurrency",
    text: "What is a deadlock?",
    options: [
      "A thread that finishes too early",
      "Two threads writing the same file",
      "Threads waiting for each other forever",
      "A lock released twice by one thread",
    ],
    correctIndex: 2,
    explanation:
      "In a deadlock each thread holds a lock that another one needs, so none of them can ever continue.",
  },
  {
    id: "m30",
    level: "middle",
    topic: "Concurrency",
    text: "Which class gives a thread-safe counter without synchronized?",
    options: [
      "A plain Integer",
      "AtomicInteger",
      "ConcurrentInteger",
      "BigInteger",
    ],
    correctIndex: 1,
    explanation:
      "AtomicInteger updates its value with atomic hardware operations, so incrementAndGet() is thread-safe without a lock.",
  },
  {
    id: "m31",
    level: "middle",
    topic: "JVM",
    text: "Which memory area stores the objects created with new?",
    options: [
      "The thread stack",
      "The metaspace",
      "The code cache",
      "The Java heap",
    ],
    correctIndex: 3,
    explanation:
      "Objects live on the heap, which is shared by all threads and managed by the garbage collector.",
  },
  {
    id: "m32",
    level: "middle",
    topic: "JVM",
    text: "Why do most garbage collectors use generations?",
    options: [
      "Old objects are always larger",
      "Young objects are never shared",
      "Most objects die young",
      "It saves disk space",
    ],
    correctIndex: 2,
    explanation:
      "Most objects become garbage soon after creation, so collecting a small young generation often is cheaper than scanning the whole heap.",
  },
  {
    id: "m33",
    level: "middle",
    topic: "JVM",
    text: "What does the classloader do?",
    options: [
      "Compiles source files to bytecode",
      "Loads class files into the JVM",
      "Creates objects on the heap",
      "Deletes unused classes at once",
    ],
    correctIndex: 1,
    explanation:
      "A classloader finds the bytes of a class and defines it in the JVM so the program can use it.",
  },
  {
    id: "m34",
    level: "middle",
    topic: "OOP",
    text: "What is polymorphism?",
    options: [
      "Hiding data inside a class",
      "Copying one object to another",
      "Calls that behave per object type",
      "Compiling one class into many files at once",
    ],
    correctIndex: 2,
    explanation:
      "With polymorphism the same method call runs different code depending on the real type of the object.",
  },
  {
    id: "m35",
    level: "middle",
    topic: "OOP",
    text: "Which can hold instance fields: an interface or an abstract class?",
    options: [
      "An interface",
      "Both of them",
      "Neither of them",
      "An abstract class",
    ],
    correctIndex: 3,
    explanation:
      "An abstract class can have instance fields and constructors. An interface can only declare constants and no instance state.",
  },
  {
    id: "m36",
    level: "middle",
    topic: "OOP",
    text: "What makes a class immutable?",
    options: [
      "It only contains static factory methods",
      "It is declared abstract and sealed",
      "It has a private no-argument constructor",
      "State is fixed after creation",
    ],
    correctIndex: 3,
    explanation:
      "An immutable object cannot change after construction: its fields are final and it exposes no way to modify them.",
  },
  {
    id: "m37",
    level: "middle",
    topic: "Modern Java",
    text: "What is a functional interface?",
    options: [
      "An interface with one abstract method",
      "An interface with only static methods",
      "An interface that extends Function",
      "An interface with no methods",
    ],
    correctIndex: 0,
    explanation:
      "A functional interface has exactly one abstract method, so a lambda or method reference can implement it.",
  },
  {
    id: "m38",
    level: "middle",
    topic: "Modern Java",
    text: "What does the arrow in the lambda (x) -> x * 2 separate?",
    options: [
      "Declarations from imports",
      "The parameters from the body",
      "Classes from methods",
      "Inputs from the output stream",
    ],
    correctIndex: 1,
    explanation:
      "The part before -> lists the parameters and the part after it is the body of the lambda.",
  },
  {
    id: "m39",
    level: "middle",
    topic: "Design",
    text: "Which principle says a class should have only one reason to change?",
    options: [
      "Open/Closed Principle",
      "Liskov Substitution",
      "Dependency Inversion",
      "Single Responsibility",
    ],
    correctIndex: 3,
    explanation:
      "The Single Responsibility Principle says each class should do one job, so changes to one concern do not ripple into others.",
  },
  {
    id: "m40",
    level: "middle",
    topic: "Design",
    text: "Which pattern lets you create objects without exposing their constructors?",
    options: [
      "Factory pattern",
      "Observer pattern",
      "Decorator pattern",
      "Template pattern",
    ],
    correctIndex: 0,
    explanation:
      "A factory method or class hides how and which objects are created behind a method call.",
  },
];
