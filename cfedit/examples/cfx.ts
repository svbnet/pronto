import * as fs from "fs";
import * as path from "path";
import { GrammarParser } from "../src/grammar/parser";
import { CFDeserializer } from "../src/cf/deserializer";
import { CFArray, CFIntegerPointer, CFObject, CFObjectPointer, CFPointer, CFPointerProperty, CFString } from "../src/cf/types";


const main = (cfPath: string) => {
  console.log('Using path', cfPath);

  const grammar = new GrammarParser(
    fs.readFileSync(
      path.join(__dirname, "src", "grammar", "grammar-merged.xml"),
      { encoding: "utf-8" }
    )
  );
  
  const typeRegistry = grammar.parse();

  const cfData = fs.readFileSync(cfPath).buffer;
  const cfDes = new CFDeserializer(typeRegistry);
  const rootElem = cfDes.parse(cfData);

  let indent = 0;

  const withIndent = (callback: () => void) => {
    indent += 1;
    try {
      callback();
    } finally {
      indent -= 1;
    }
  }

  const print = (...args: string[]) => {
    const line = args.join(' ');
    console.log(`${'\t'.repeat(indent)}${line}`);
  }

  const printPointer = (pointer: CFPointer) => {
    if (pointer.isNull) {
      print('>', '(null)');
      return
    }
    if (pointer instanceof CFObjectPointer) {
      print('>', pointer.inspect());
      withIndent(() => {
        printObject(pointer.dereference(cfDes, cfData));
      });
    } else if (pointer instanceof CFIntegerPointer) {
      const value = pointer.dereference(cfData);
      print('>', pointer.inspect(), ':', value.toString());
    }
  }

  const printString = (object: CFString) => {
    print('---', object.inspect(), '---');
    print(object.getContents(cfData));
    print('---');
  };

  const printObject = (object: CFObject) => {
    if (object instanceof CFString) {
      printString(object);
      return;
    }
    print('+', object.inspect());
    withIndent(() => {
      object.properties.forEach((prop) => {
        print('-', prop.inspect());
        if (prop instanceof CFPointerProperty) {
          withIndent(() => {
            printPointer(prop.pointer);
          });
        }
      });
    });
  }

  printObject(rootElem);
};


main(process.argv[2]);
