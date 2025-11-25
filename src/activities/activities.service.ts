import { Injectable } from '@nestjs/common';
import { MssqlService } from '@strongnguyen/nestjs-mssql';

@Injectable()
export class ActivitiesService {
    constructor(
        private readonly mssql: MssqlService,
    ) {}

    async getActivityById(claveActividad: string) {
        const pool = this.mssql.getPool();
        const result = await pool
            .request()
            .input('ClaveActividad', claveActividad)
            .query(`SELECT * FROM Actividad WHERE ClaveActividad = @ClaveActividad`);

        return result.recordset || null;
    }

    async getAllActivities() {
        const pool = this.mssql.getPool();
        const result = await pool
            .request()
            .query(`SELECT * FROM Actividad`);

        return result.recordset || null;
    }

    async getDocumentsByActivity(claveActividad: string)  {
        const pool = this.mssql.getPool();
        const result = await pool
            .request()
            .input('ClaveActividad', claveActividad)
            .query(`SELECT * FROM Actividad_Documento WHERE ClaveActividad = @ClaveActividad`);  
            
        return result.recordset.map(row => ({
            documento: row.ClaveDocumento,
            departamento: row.ClaveDepartamento
        }));
    }
}