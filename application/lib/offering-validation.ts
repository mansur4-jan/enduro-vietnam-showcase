import {z} from 'zod';
const localeText=z.object({en:z.string().max(500).optional(),ru:z.string().max(500).optional()});
const money=z.object({currency:z.enum(['USD','VND']),amountMinor:z.number().int().nonnegative().max(100000000000).nullable(),basis:z.enum(['from','fixed','request']),unit:z.enum(['person','group','day','week','month','3_days']).nullable(),priceStatus:z.string().max(60)});
const safePath=z.string().regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/).max(200);
export const offeringDataSchema=z.object({
 categoryIds:z.array(z.string().max(100)).max(20).optional(),endDestinationId:z.string().max(100).nullable().optional(),
 translations:z.object({en:z.object({title:z.string().min(2).max(200),description:z.string().max(600),body:z.array(z.string().max(10000)).max(500),sourcePage:safePath.optional()}).optional(),ru:z.object({title:z.string().min(2).max(200),description:z.string().max(600),body:z.array(z.string().max(10000)).max(500),sourcePage:safePath.optional()}).optional()}).refine(v=>!!v.en||!!v.ru,'At least one language required'),
 routes:z.object({en:safePath.optional(),ru:safePath.optional()}),
 photos:z.array(z.object({src:z.string().regex(/^\/(assets|media)\/[a-zA-Z0-9/_.-]+$/).refine(v=>!v.includes('..')),alt:localeText,rights:z.string().max(500).optional()})).max(30),
 commerce:money,duration:z.object({value:z.number().positive().max(365),unit:z.enum(['hours','days']),nights:z.number().int().nonnegative().nullable()}).optional(),
 supplier:z.string().min(2).max(200),variants:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]+$/),name:localeText,commerce:money})).max(30),
 tariffs:z.array(z.object({id:z.string().max(80),period:z.enum(['day','3_days','week','month']),currency:z.enum(['USD','VND']),amountMinor:z.number().int().nonnegative().nullable(),status:z.string().max(80)})).max(20).optional(),
 deposit:z.object({currency:z.enum(['USD','VND']),amountMinor:z.number().int().nonnegative().nullable()}).optional(),vehicle:z.record(z.string().max(60),z.union([z.string().max(500),z.number(),z.boolean(),z.null()])).optional(),
 program:z.record(z.string(),z.unknown()).optional(),conditions:z.record(z.string(),z.unknown()).optional(),handoff:z.record(z.string(),z.unknown()).optional(),groupSize:z.number().int().positive().nullable().optional(),level:z.string().max(100).nullable().optional(),guideLanguages:z.array(z.string().max(50)).optional(),sourceNotice:z.boolean().optional()
});
