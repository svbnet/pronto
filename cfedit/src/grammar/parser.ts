import { Document, DOMParser, Element, Node } from "@xmldom/xmldom";
import { TypeRegistry } from "./registry";
import {
  Attrib,
  Bit,
  Bitmask,
  Bits,
  Class,
  ClassRef,
  Enum,
  EnumEntry,
  Mask,
} from "./types";
import { AttribType } from "./attrib-type";

const getChildElements = (element: Element) =>
  element.childNodes.filter(
    (node) => node.nodeType === Node.ELEMENT_NODE
  ) as Element[];

const findChildrenByTagName = (element: Element, tagName: string) =>
  getChildElements(element).filter((elem) => elem.tagName === tagName);

const parseType = (attrType: string): ClassRef | AttribType => {
  if (Object.values(AttribType).includes(attrType as AttribType)) {
    return attrType as AttribType;
  } else {
    return new ClassRef(attrType);
  }
};

const requireAttribute = (elem: Element, name: string) => {
  if (!elem.hasAttribute(name))
    throw new Error(
      `expected attribute '${name}' to be defined on element <${elem.tagName}>`
    );
  return elem.getAttribute(name)!;
};

export class GrammarParser {
  private readonly doc: Document;
  private readonly grammar: Element;

  constructor(xml: string) {
    const parser = new DOMParser();
    this.doc = parser.parseFromString(xml, "text/xml");

    const gram = this.doc.getElementsByTagName("grammar").item(0);
    if (!gram) throw new Error("Invalid doc");

    this.grammar = gram;
  }

  get revision() {
    return Number(this.grammar.getAttribute("rev"));
  }

  private handleBits(bitsDef: Element): Bits {
    const enumsDef = findChildrenByTagName(bitsDef, 'enum');

    return {
      from: Number(requireAttribute(bitsDef, 'from')),
      to: Number(requireAttribute(bitsDef, 'to')),
      name: requireAttribute(bitsDef, 'name'),
      enum: enumsDef.length ? this.handleEnum(enumsDef[0]) : undefined,
    };
  }

  private handleBit(bitDef: Element): Bit {
    return {
      index: Number(requireAttribute(bitDef, 'index')),
      name: requireAttribute(bitDef, 'name'),
    };
  }

  private handleBitmask(bitmaskDef: Element): Bitmask {
    const bitsDefs = findChildrenByTagName(bitmaskDef, 'bits');
    const bitDefs = findChildrenByTagName(bitmaskDef, 'bit');

    const bitsVal = [];
    if (bitDefs) {
      bitsVal.push(...bitDefs.map((v) => this.handleBit(v)));
    }
    if (bitsDefs) {
      bitsVal.push(...bitsDefs.map((v) => this.handleBits(v)));
    }

    return {
      bits: bitsVal,
    };
  }

  private handleEnumEntry(enumEntryDef: Element): EnumEntry {

    return {
      name: enumEntryDef.getAttribute('name') ?? undefined,
      value: Number(requireAttribute(enumEntryDef, 'value')),
    };
  }

  private handleEnum(enumDef: Element): Enum {
    const entries = findChildrenByTagName(enumDef, 'entry');

    return {
      prefix: enumDef.getAttribute('prefix') ?? undefined,
      entries: entries.map((e) => this.handleEnumEntry(e)),
    };
  }

  private handleAttribute(
    registry: TypeRegistry,
    klass: Class,
    attributeDef: Element
  ): Attrib {
    const attrType = attributeDef.getAttribute("type")!;

    let enumVal: Enum | undefined = undefined;
    const enumDef = findChildrenByTagName(attributeDef, "enum");
    const bitmaskDef = findChildrenByTagName(attributeDef, "bitmask");

    if (enumDef.length) {
      enumVal = this.handleEnum(enumDef[0]);
    }

    return new Attrib(
      klass,
      requireAttribute(attributeDef, "name")!,
      parseType(requireAttribute(attributeDef, "type")),
      attributeDef.getAttribute("ancestor") === "1",
      attributeDef.getAttribute("array") === "1",
      attributeDef.hasAttribute("padding")
        ? Number(attributeDef.getAttribute("padding"))
        : 0,
      attributeDef.hasAttribute("ptrtgt")
        ? parseType(attributeDef.getAttribute("ptrtgt")!)
        : undefined,
      attributeDef.hasAttribute("mask")
        ? Number(attributeDef.getAttribute("mask"))
        : undefined,
      enumVal,
      attributeDef.hasAttribute("count")
        ? Number(attributeDef.getAttribute("count"))
        : 1,
      bitmaskDef.length ? this.handleBitmask(bitmaskDef[0]) : undefined
    );
  }

  private handleMask(maskDef: Element): Mask {
    return {
      name: maskDef.getAttribute("name") as string,
      value: Number(maskDef.getAttribute("value")),
    };
  }

  private handleClass(registry: TypeRegistry, classDef: Element): Class {
    const klass = new Class(
      registry,
      classDef.getAttribute("name") as string,
      classDef.hasAttribute("classid")
        ? Number(classDef.getAttribute("classid"))
        : 999,
      [],
      []
    );

    klass.attributes = findChildrenByTagName(classDef, "attrib").map((a) =>
      this.handleAttribute(registry, klass, a)
    );
    const masks = findChildrenByTagName(classDef, "masks");
    if (masks.length) {
      klass.masks = masks.map((m) => this.handleMask(m));
    }

    return klass;
  }

  parse(registry?: TypeRegistry): TypeRegistry {
    const actualRegistry = registry ?? new TypeRegistry();

    const classes = this.grammar.childNodes.filter(
      (n) => n.nodeType === Node.ELEMENT_NODE
    ) as Element[];
    classes.forEach((classDef) => {
      actualRegistry.add(this.handleClass(actualRegistry, classDef));
    });

    return actualRegistry;
  }
}
