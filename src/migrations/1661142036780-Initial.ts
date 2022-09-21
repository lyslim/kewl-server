import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1661142036780 implements MigrationInterface {
    name = 'Initial1661142036780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "updoot" ("value" integer NOT NULL, "userUuid" uuid NOT NULL, "postUuid" uuid NOT NULL, CONSTRAINT "PK_df408cd87a0b708d07e8332bf18" PRIMARY KEY ("userUuid", "postUuid"))`);
        await queryRunner.query(`CREATE TABLE "post" ("uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "text" character varying NOT NULL, "points" integer NOT NULL DEFAULT '0', "creatorUuid" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_852036802b135c3f93089c85137" PRIMARY KEY ("uuid"))`);
        await queryRunner.query(`CREATE TABLE "user" ("uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8" UNIQUE ("name"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_a95e949168be7b7ece1a2382fed" PRIMARY KEY ("uuid"))`);
        await queryRunner.query(`ALTER TABLE "updoot" ADD CONSTRAINT "FK_0f3d54094d2a5734b5e9bee8cb0" FOREIGN KEY ("userUuid") REFERENCES "user"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "updoot" ADD CONSTRAINT "FK_8a561d254c0f339acf91f365c54" FOREIGN KEY ("postUuid") REFERENCES "post"("uuid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_5c124b197dd68ac7f134a5f1660" FOREIGN KEY ("creatorUuid") REFERENCES "user"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_5c124b197dd68ac7f134a5f1660"`);
        await queryRunner.query(`ALTER TABLE "updoot" DROP CONSTRAINT "FK_8a561d254c0f339acf91f365c54"`);
        await queryRunner.query(`ALTER TABLE "updoot" DROP CONSTRAINT "FK_0f3d54094d2a5734b5e9bee8cb0"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "post"`);
        await queryRunner.query(`DROP TABLE "updoot"`);
    }

}
