import { Injectable } from '@nestjs/common';
import { MssqlService } from '@strongnguyen/nestjs-mssql';

@Injectable()
export class ActivitiesService {
    constructor(
        private readonly mssql: MssqlService,
    ) {}

    async getActivityById(activityID: string) {
        const pool = this.mssql.getPool();
        const result = await pool
            .request()
            .input('ClaveActividad', activityID)
            .query(`SELECT * FROM Actividad WHERE ClaveActividad = @ClaveActividad`);

        return result.recordset[0] || null;
    }

    async getAllActivities() {
        const pool = this.mssql.getPool();
        const result = await pool
            .request()
            .query(`SELECT * FROM Actividad`);
            
        return result.recordset;
    }
}