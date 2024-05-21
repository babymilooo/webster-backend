import { HydratedDocument, Schema, model } from "mongoose";

export interface ISchemaProject {
  title?: string;
  picture?: string;
}

const projectSchema = new Schema<ISchemaProject>({
  title: {
    type: String,
    default: "",
    trim: true,
  },
  picture: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});


export const Project = model<ISchemaProject>("Project", projectSchema);

export type IProject = HydratedDocument<ISchemaProject>;
